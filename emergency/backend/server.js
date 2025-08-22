// Enhanced Backend WebSocket Server (server.js) for Kumbh Mela Emergency System
import { GoogleGenerativeAI } from "@google/generative-ai";
import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Enable CORS for all routes
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Enhanced clients tracking with emergency data storage
const clients = {
  dashboard: new Set(),
  mobileApps: new Set(),
};

// Emergency data storage
const emergencyDatabase = {
  active: new Map(),
  resolved: new Map(),
  statistics: {
    totalCalls: 0,
    emergencyTypes: {},
    priorityDistribution: { very_high: 0, high: 0, medium: 0, low: 0 },
    volunteerDispatches: 0,
    averageResponseTime: 0,
    locationData: {},
    dailyStats: {}
  }
};

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not defined in environment variables");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeEmergencyCall(conversationHistory, emergencyDetails = null) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      safetySettings: [
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_ONLY_HIGH",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH",
        },
      ],
    });

    let prompt;
    
    // Enhanced prompt for Kumbh Mela specific analysis
    if (emergencyDetails) {
      prompt = `Analyze this Kumbh Mela emergency call and enhance the existing analysis:

Conversation History:
${JSON.stringify(conversationHistory)}

Existing Emergency Details:
${JSON.stringify(emergencyDetails)}

Extract comprehensive information in this JSON structure:
{
  "location": "Specific location with Kumbh landmarks",
  "zone_sector": "Zone/Sector information",
  "name": "Caller's name if mentioned",
  "age": "Caller's age if mentioned", 
  "summary": "Detailed emergency situation summary",
  "type": "lost_child|medical_crowd|crowd_safety|fire_emergency|water_emergency|security|weather|electrical|transport|accessibility",
  "title": "Clear emergency description",
  "priority": "very_high|high|medium|low",
  "landmarks": ["list", "of", "kumbh", "landmarks"],
  "emotional_state": "very_high|high|medium|calm",
  "volunteer_status": "dispatched|involved|needed|not_required",
  "specific_details": {
    "situation_assessment": "detailed assessment",
    "immediate_actions_needed": ["action1", "action2"],
    "resources_required": ["resource1", "resource2"],
    "cultural_considerations": "Hindu festival considerations"
  },
  "coordinates": "approximate lat,lng if derivable from location",
  "estimated_people_affected": "number or range",
  "weather_impact": "none|low|medium|high",
  "crowd_density_factor": "low|medium|high|extreme"
}`;
    } else {
      // Fallback for basic analysis
      prompt = `Analyze this emergency conversation and extract key details in JSON format:

Conversation:
${JSON.stringify(conversationHistory)}

Extract the following information EXACTLY in this JSON structure:
{
  "location": "Exact address or location mentioned",
  "name": "Caller's name if mentioned",
  "age": "Caller's age if mentioned",
  "summary": "Concise summary of the emergency situation",
  "type": "critical|moderate|low",
  "title": "Short emergency description"
}

Rules:
- If no specific detail is found, use "Unknown"
- Type must be one of: critical, moderate, low
- Be as precise and accurate as possible`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("AI Analysis Response:", text);
    
    // Clean and parse the JSON
    const cleanText = text
      .replace(/```json?/g, "")
      .replace(/```/g, "")
      .trim();
    
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Google AI Analysis Error:", error);
    return {
      location: "Unknown",
      name: "Unknown", 
      age: "Unknown",
      summary: "Failed to process emergency details",
      type: "low",
      title: "Analysis Error",
      priority: "low",
      emotional_state: "unknown"
    };
  }
}

// Enhanced webhook handler for Kumbh Mela emergencies
app.post("/kumbh-webhook", async (req, res) => {
  try {
    console.log("🕉️ Received Kumbh Mela Emergency:", req.body);
    const kumbhData = req.body;
    
    const conversationHistory = kumbhData.convo?.data || [];
    const existingDetails = kumbhData.emergency_details || null;
    
    // Enhanced AI analysis
    const aiAnalysis = await analyzeEmergencyCall(conversationHistory, existingDetails);
    
    // Create comprehensive emergency record
    const emergencyRecord = {
      id: kumbhData.id || `kumbh-${Date.now()}`,
      timestamp: new Date().toISOString(),
      festival: "Kumbh Mela 2025",
      city: "Nashik", 
      originalConversation: conversationHistory,
      emergencyDetails: existingDetails || {},
      aiAnalysis: aiAnalysis,
      status: "active",
      responseTeam: null,
      lastUpdate: new Date().toISOString(),
      metadata: kumbhData.metadata || {}
    };
    
    // Store in emergency database
    emergencyDatabase.active.set(emergencyRecord.id, emergencyRecord);
    updateStatistics(emergencyRecord);
    
    // Broadcast to all connected clients
    broadcastToDashboard({
      type: "kumbh-emergency-update",
      data: emergencyRecord
    });
    
    broadcastToMobileApps({
      type: "new-emergency-alert", 
      data: {
        id: emergencyRecord.id,
        type: aiAnalysis.type,
        priority: aiAnalysis.priority,
        location: aiAnalysis.location,
        summary: aiAnalysis.summary,
        timestamp: emergencyRecord.timestamp
      }
    });
    
    console.log(`✅ Processed Kumbh emergency ${emergencyRecord.id}`);
    res.status(200).json({ 
      status: "success", 
      emergencyId: emergencyRecord.id,
      analysis: aiAnalysis
    });
    
  } catch (error) {
    console.error("❌ Kumbh webhook processing error:", error);
    
    // Send fallback emergency data
    const fallbackEmergency = {
      id: `kumbh-error-${Date.now()}`,
      timestamp: new Date().toISOString(),
      originalConversation: [
        { role: "assistant", content: "कुंभ मेला आपातकालीन सेवा - Kumbh Mela Emergency Service" }
      ],
      aiAnalysis: {
        location: "Nashik - Location Unknown",
        name: "Unknown",
        age: "Unknown", 
        summary: "Emergency call processing error",
        type: "technical_error",
        title: "System Processing Error",
        priority: "medium"
      },
      status: "error"
    };
    
    broadcastToDashboard({
      type: "kumbh-emergency-update",
      data: fallbackEmergency
    });
    
    res.status(500).json({ 
      status: "error", 
      error: error.message,
      fallbackData: fallbackEmergency
    });
  }
});

// Legacy Twilio webhook (maintained for compatibility)
app.post("/twilio-webhook", async (req, res) => {
  try {
    console.log("📞 Received Twilio webhook:", req.body);
    const twilioData = req.body;
    const conversationHistory = twilioData.convo?.data || [];
    const aiAnalysis = await analyzeEmergencyCall(conversationHistory);

    const enrichedData = {
      id: twilioData.id || "unknown-id",
      timestamp: new Date().toISOString(),
      originalConversation: conversationHistory,
      aiAnalysis: aiAnalysis,
      source: "twilio"
    };

    broadcastToDashboard({
      type: "twilio-update", 
      data: enrichedData
    });

    res.status(200).send("Processed");
  } catch (error) {
    console.error("Twilio webhook error:", error);
    res.status(500).send("Processing Error");
  }
});

function updateStatistics(emergencyRecord) {
  const stats = emergencyDatabase.statistics;
  const analysis = emergencyRecord.aiAnalysis;
  
  stats.totalCalls++;
  
  // Emergency type tracking
  const emergType = analysis.type || 'unknown';
  stats.emergencyTypes[emergType] = (stats.emergencyTypes[emergType] || 0) + 1;
  
  // Priority distribution
  const priority = analysis.priority || 'medium';
  if (stats.priorityDistribution[priority] !== undefined) {
    stats.priorityDistribution[priority]++;
  }
  
  // Location tracking
  const location = analysis.location || 'Unknown';
  stats.locationData[location] = (stats.locationData[location] || 0) + 1;
  
  // Daily stats
  const today = new Date().toDateString();
  if (!stats.dailyStats[today]) {
    stats.dailyStats[today] = { calls: 0, types: {} };
  }
  stats.dailyStats[today].calls++;
  stats.dailyStats[today].types[emergType] = (stats.dailyStats[today].types[emergType] || 0) + 1;
  
  // Volunteer dispatch tracking
  if (emergencyRecord.emergencyDetails?.volunteer_dispatched) {
    stats.volunteerDispatches++;
  }
}

// API Routes for Dashboard and Mobile Apps

// Get all active emergencies
app.get("/api/emergencies/active", (req, res) => {
  const activeEmergencies = Array.from(emergencyDatabase.active.values());
  res.json({
    count: activeEmergencies.length,
    emergencies: activeEmergencies.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  });
});

// Get emergency statistics
app.get("/api/statistics", (req, res) => {
  res.json({
    ...emergencyDatabase.statistics,
    activeEmergencies: emergencyDatabase.active.size,
    resolvedEmergencies: emergencyDatabase.resolved.size,
    lastUpdated: new Date().toISOString()
  });
});

// Get emergency by ID
app.get("/api/emergencies/:id", (req, res) => {
  const { id } = req.params;
  const emergency = emergencyDatabase.active.get(id) || emergencyDatabase.resolved.get(id);
  
  if (emergency) {
    res.json(emergency);
  } else {
    res.status(404).json({ error: "Emergency not found" });
  }
});

// Update emergency status
app.put("/api/emergencies/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, responseTeam, notes } = req.body;
  
  const emergency = emergencyDatabase.active.get(id);
  if (emergency) {
    emergency.status = status;
    emergency.responseTeam = responseTeam;
    emergency.notes = notes;
    emergency.lastUpdate = new Date().toISOString();
    
    if (status === "resolved") {
      emergencyDatabase.resolved.set(id, emergency);
      emergencyDatabase.active.delete(id);
    }
    
    // Broadcast update
    broadcastToDashboard({
      type: "emergency-status-update",
      data: emergency
    });
    
    res.json({ success: true, emergency });
  } else {
    res.status(404).json({ error: "Emergency not found" });
  }
});

// Get emergency types and their details
app.get("/api/emergency-types", (req, res) => {
  res.json({
    types: {
      lost_child: { 
        priority: "very_high", 
        description: "Missing children or separated families",
        color: "#dc3545",
        icon: "👶"
      },
      medical_crowd: { 
        priority: "high", 
        description: "Medical emergencies in crowded areas",
        color: "#fd7e14", 
        icon: "🏥"
      },
      crowd_safety: { 
        priority: "high", 
        description: "Stampede prevention and crowd control",
        color: "#dc3545",
        icon: "👥" 
      },
      fire_emergency: { 
        priority: "very_high", 
        description: "Fire incidents and evacuation",
        color: "#dc3545",
        icon: "🔥"
      },
      water_emergency: { 
        priority: "very_high", 
        description: "Drowning and water rescue",
        color: "#0d6efd",
        icon: "🌊"
      },
      security: { 
        priority: "medium", 
        description: "Theft, harassment, and security issues",
        color: "#ffc107",
        icon: "🔒"
      },
      weather: { 
        priority: "medium", 
        description: "Weather-related emergencies",
        color: "#6f42c1",
        icon: "⛈️"
      },
      electrical: { 
        priority: "high", 
        description: "Electrical hazards and power issues",
        color: "#fd7e14",
        icon: "⚡"
      },
      transport: { 
        priority: "medium", 
        description: "Vehicle and transportation issues",
        color: "#20c997",
        icon: "🚌"
      },
      accessibility: { 
        priority: "medium", 
        description: "Assistance for disabled pilgrims",
        color: "#6610f2",
        icon: "♿"
      }
    }
  });
});

// Dashboard data endpoint
app.get("/api/dashboard", (req, res) => {
  const activeEmergencies = Array.from(emergencyDatabase.active.values());
  const recentResolved = Array.from(emergencyDatabase.resolved.values())
    .sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate))
    .slice(0, 10);
    
  res.json({
    activeEmergencies,
    recentResolved,
    statistics: emergencyDatabase.statistics,
    serverStatus: {
      uptime: process.uptime(),
      connectedClients: {
        dashboard: clients.dashboard.size,
        mobileApps: clients.mobileApps.size
      },
      lastUpdate: new Date().toISOString()
    }
  });
});

// WebSocket connection handler
wss.on("connection", (ws, req) => {
  const clientType = new URL(
    req.url,
    `http://${req.headers.host}`,
  ).searchParams.get("type");

  // Add client to appropriate group
  if (clientType === "dashboard") {
    clients.dashboard.add(ws);
    console.log("📊 Dashboard client connected");
    
    // Send current emergency data to new dashboard client
    ws.send(JSON.stringify({
      type: "initial-data",
      data: {
        activeEmergencies: Array.from(emergencyDatabase.active.values()),
        statistics: emergencyDatabase.statistics
      }
    }));
    
  } else if (clientType === "mobile-app") {
    clients.mobileApps.add(ws);
    console.log("📱 Mobile app client connected");
  }

  // Message handling
  ws.on("message", (message) => {
    try {
      const parsedMessage = JSON.parse(message);

      // Handle different message types
      if (parsedMessage.action === "update-emergency") {
        const { id, status, notes } = parsedMessage.data;
        const emergency = emergencyDatabase.active.get(id);
        if (emergency) {
          emergency.status = status;
          emergency.notes = notes;
          emergency.lastUpdate = new Date().toISOString();
          
          // Broadcast update
          broadcastToDashboard({
            type: "emergency-status-update", 
            data: emergency
          });
        }
      }
      
      // Determine message source and broadcast accordingly
      if (clientType === "dashboard") {
        broadcastToMobileApps({
          type: "dashboard-update",
          data: parsedMessage,
        });
      } else if (clientType === "mobile-app") {
        broadcastToDashboard({
          type: "mobile-app-update",
          data: parsedMessage,
        });
      }
    } catch (error) {
      console.error("Message parsing error:", error);
    }
  });

  // Connection close handler
  ws.on("close", () => {
    if (clientType === "dashboard") {
      clients.dashboard.delete(ws);
      console.log("📊 Dashboard client disconnected");
    } else if (clientType === "mobile-app") {
      clients.mobileApps.delete(ws);
      console.log("📱 Mobile app client disconnected");
    }
  });
});

// Broadcast utility functions
function broadcastToDashboard(message) {
  clients.dashboard.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      console.log("📊 Broadcasting to dashboard");
      client.send(JSON.stringify(message));
    }
  });
}

function broadcastToMobileApps(message) {
  clients.mobileApps.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      console.log("📱 Broadcasting to mobile apps");
      client.send(JSON.stringify(message));
    }
  });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "operational",
    service: "Kumbh Mela Emergency Response System",
    version: "2.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    emergencies: {
      active: emergencyDatabase.active.size,
      resolved: emergencyDatabase.resolved.size,
      total: emergencyDatabase.statistics.totalCalls
    },
    clients: {
      dashboard: clients.dashboard.size,
      mobileApps: clients.mobileApps.size
    }
  });
});

// Serve the demo dashboard at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log("🕉️ ========================================");
  console.log("   KUMBH MELA EMERGENCY RESPONSE SYSTEM");
  console.log("🕉️ ========================================");
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}?type=dashboard`);
  console.log("🚨 Emergency Types Supported:");
  console.log("   ├── Lost Child/Adult (Very High Priority)");
  console.log("   ├── Medical Emergencies (High Priority)");
  console.log("   ├── Crowd Safety & Stampede (High Priority)");
  console.log("   ├── Fire Emergencies (Very High Priority)");
  console.log("   ├── Water Rescue (Very High Priority)");
  console.log("   ├── Security Issues (Medium Priority)");
  console.log("   ├── Weather Emergencies (Medium Priority)");
  console.log("   ├── Electrical Hazards (High Priority)");
  console.log("   ├── Transport Issues (Medium Priority)");
  console.log("   └── Accessibility Support (Medium Priority)");
  console.log("🏛️ Location: Nashik Kumbh Mela 2025");
  console.log("🔄 Ready for Emergency Calls!");
  console.log("========================================");
});