// WebSocket Server for Kumbh Mela Emergency System (server.js)
import { GoogleGenerativeAI } from "@google/generative-ai";
import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch";

dotenv.config();
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Enable CORS for all routes
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Clients tracking for different types
const clients = {
  dashboard: new Set(),
  volunteers: new Set(),
  admin: new Set(),
};

// Emergency data store (in production, use proper database)
const emergencyStore = new Map();
const volunteerStore = new Map();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Initialize Google AI if available
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
  console.warn("GEMINI_API_KEY not found - AI analysis will be disabled");
}

// FastAPI server configuration
const FASTAPI_BASE_URL = process.env.FASTAPI_URL || "http://localhost:5000";

async function analyzeEmergencyCall(conversationHistory) {
  if (!genAI) {
    return {
      location: "Unknown",
      name: "Unknown", 
      age: "Unknown",
      summary: "AI analysis disabled - no API key",
      type: "moderate",
      title: "Emergency Report",
      emergencyType: "general_emergency"
    };
  }

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

    const prompt = `Analyze this Kumbh Mela emergency conversation and extract key details in JSON format:

Conversation History:
${JSON.stringify(conversationHistory)}

Extract information for this Kumbh Mela emergency in this JSON structure:
{
  "location": "Specific location (gate number, zone color, landmark)",
  "name": "Caller's name if mentioned",
  "age": "Caller's age if mentioned", 
  "summary": "Detailed emergency summary",
  "type": "critical|moderate|low",
  "title": "Brief emergency title",
  "emergencyType": "lost_child|lost_adult|medical|fire|crowd|security|water|general_emergency",
  "landmarks": ["list", "of", "nearby", "landmarks"],
  "personDescription": "Description of missing person if applicable"
}

Kumbh Mela specific locations to recognize:
- Gates: gate 1, gate 2, etc.
- Zones: red zone, blue zone, green zone, yellow zone
- Landmarks: ramkund, triveni sangam, kalaram temple, godavari ghat
- Facilities: medical post, police post, control room, parking area

Rules:
- If location not found, use "location_unclear"
- Emergency types: lost_child, lost_adult, medical, fire, crowd, security, water, general_emergency
- Priority: critical (life threatening), moderate (urgent), low (non-urgent)`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const cleanText = text
      .replace(/```json?/g, "")
      .replace(/```/g, "")
      .trim();
      
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Google AI Analysis Error:", error);
    return {
      location: "location_unclear",
      name: "Unknown",
      age: "Unknown", 
      summary: "Emergency reported via voice call",
      type: "moderate",
      title: "Emergency Report",
      emergencyType: "general_emergency"
    };
  }
}

// Webhook to receive emergency updates from FastAPI
app.post("/fastapi-webhook", async (req, res) => {
  try {
    console.log("Received FastAPI webhook:", req.body);
    const emergencyData = req.body;
    
    // Store emergency data
    emergencyStore.set(emergencyData.id, {
      ...emergencyData,
      receivedAt: new Date().toISOString(),
      source: "fastapi"
    });

    // Broadcast to all dashboard clients
    broadcastToDashboard({
      type: "emergency-alert",
      data: emergencyData
    });

    // Broadcast to volunteer clients if high priority
    if (emergencyData.priority === "high") {
      broadcastToVolunteers({
        type: "urgent-emergency", 
        data: emergencyData
      });
    }

    res.status(200).json({ status: "processed", id: emergencyData.id });
  } catch (error) {
    console.error("FastAPI webhook processing error:", error);
    res.status(500).json({ error: "Processing failed" });
  }
});

// Twilio webhook for voice call analysis (if used alongside FastAPI)
app.post("/twilio-webhook", async (req, res) => {
  try {
    console.log("Received Twilio webhook:", req.body);
    const twilioData = req.body;
    const conversationHistory = twilioData.convo?.data || [];
    
    const aiAnalysis = await analyzeEmergencyCall(conversationHistory);
    
    const enrichedData = {
      id: twilioData.id || `twilio-${Date.now()}`,
      timestamp: new Date().toISOString(),
      source: "twilio",
      originalConversation: conversationHistory,
      aiAnalysis: aiAnalysis,
      status: "active"
    };

    // Store in emergency store
    emergencyStore.set(enrichedData.id, enrichedData);

    // Forward to FastAPI if configured
    if (process.env.FASTAPI_URL) {
      try {
        await fetch(`${FASTAPI_BASE_URL}/test_emergency`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: aiAnalysis.emergencyType,
            location: aiAnalysis.location,
            description: aiAnalysis.summary,
            priority: aiAnalysis.type
          })
        });
      } catch (err) {
        console.warn("Failed to forward to FastAPI:", err.message);
      }
    }

    broadcastToDashboard({
      type: "twilio-emergency",
      data: enrichedData,
    });

    res.status(200).send("Processed");
  } catch (error) {
    console.error("Twilio webhook processing error:", error);
    res.status(500).send("Processing Error");
  }
});

// API Routes for emergency management
app.get("/api/emergencies", (req, res) => {
  const emergencies = Array.from(emergencyStore.values());
  res.json(emergencies);
});

app.get("/api/emergencies/:id", (req, res) => {
  const emergency = emergencyStore.get(req.params.id);
  if (!emergency) {
    return res.status(404).json({ error: "Emergency not found" });
  }
  res.json(emergency);
});

app.put("/api/emergencies/:id/status", (req, res) => {
  const emergency = emergencyStore.get(req.params.id);
  if (!emergency) {
    return res.status(404).json({ error: "Emergency not found" });
  }
  
  emergency.status = req.body.status;
  emergency.updatedAt = new Date().toISOString();
  
  if (req.body.volunteer_id) {
    emergency.volunteer_assigned = req.body.volunteer_id;
  }
  
  emergencyStore.set(req.params.id, emergency);
  
  // Broadcast status update
  broadcastToDashboard({
    type: "emergency-status-update",
    data: emergency
  });
  
  res.json({ status: "updated", emergency });
});

app.post("/api/emergencies/:id/resolve", (req, res) => {
  const emergency = emergencyStore.get(req.params.id);
  if (!emergency) {
    return res.status(404).json({ error: "Emergency not found" });
  }
  
  emergency.status = "resolved";
  emergency.resolvedAt = new Date().toISOString();
  emergency.resolvedBy = req.body.resolved_by || "system";
  
  emergencyStore.set(req.params.id, emergency);
  
  // Forward to FastAPI
  if (process.env.FASTAPI_URL) {
    fetch(`${FASTAPI_BASE_URL}/emergencies/${req.params.id}/resolve`, {
      method: "POST"
    }).catch(err => console.warn("Failed to sync with FastAPI:", err.message));
  }
  
  broadcastToDashboard({
    type: "emergency-resolved", 
    data: emergency
  });
  
  res.json({ status: "resolved", emergency });
});

// Volunteer management
app.post("/api/volunteers/:id/assign", (req, res) => {
  const { emergency_id } = req.body;
  const volunteer_id = req.params.id;
  
  const emergency = emergencyStore.get(emergency_id);
  if (!emergency) {
    return res.status(404).json({ error: "Emergency not found" });
  }
  
  emergency.status = "volunteer_assigned";
  emergency.volunteer_assigned = volunteer_id;
  emergency.assignedAt = new Date().toISOString();
  
  emergencyStore.set(emergency_id, emergency);
  
  // Forward to FastAPI
  if (process.env.FASTAPI_URL) {
    fetch(`${FASTAPI_BASE_URL}/emergencies/${emergency_id}/assign_volunteer`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `volunteer_id=${volunteer_id}`
    }).catch(err => console.warn("Failed to sync with FastAPI:", err.message));
  }
  
  broadcastToDashboard({
    type: "volunteer-assigned",
    data: { emergency, volunteer_id }
  });
  
  res.json({ status: "assigned", emergency, volunteer_id });
});

// Dashboard summary
app.get("/api/dashboard/summary", (req, res) => {
  const emergencies = Array.from(emergencyStore.values());
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  const summary = {
    total_active: emergencies.filter(e => e.status !== "resolved").length,
    recent_hour: emergencies.filter(e => new Date(e.timestamp) > hourAgo).length,
    by_type: {},
    by_priority: { critical: 0, moderate: 0, low: 0 },
    by_status: {},
    connected_clients: {
      dashboard: clients.dashboard.size,
      volunteers: clients.volunteers.size,
      admin: clients.admin.size
    },
    timestamp: now.toISOString()
  };
  
  emergencies.forEach(emergency => {
    // Count by type
    const type = emergency.aiAnalysis?.emergencyType || emergency.type || "unknown";
    summary.by_type[type] = (summary.by_type[type] || 0) + 1;
    
    // Count by priority
    const priority = emergency.aiAnalysis?.type || emergency.priority || "moderate";
    if (summary.by_priority[priority] !== undefined) {
      summary.by_priority[priority]++;
    }
    
    // Count by status
    const status = emergency.status || "active";
    summary.by_status[status] = (summary.by_status[status] || 0) + 1;
  });
  
  res.json(summary);
});

// WebSocket connection handler
wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const clientType = url.searchParams.get("type") || "dashboard";
  const clientId = url.searchParams.get("id");
  
  console.log(`${clientType} client connected${clientId ? ` (ID: ${clientId})` : ""}`);
  
  // Add client to appropriate group
  if (clients[clientType]) {
    clients[clientType].add(ws);
  } else {
    clients.dashboard.add(ws);
  }
  
  // Store client metadata
  ws.clientType = clientType;
  ws.clientId = clientId;
  
  // Send initial data
  ws.send(JSON.stringify({
    type: "connection-established",
    clientType: clientType,
    timestamp: new Date().toISOString(),
    activeEmergencies: emergencyStore.size
  }));
  
  // Message handling
  ws.on("message", (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      console.log(`Message from ${clientType}:`, parsedMessage);
      
      // Handle different message types
      switch (parsedMessage.type) {
        case "volunteer-location-update":
          if (clientType === "volunteers") {
            broadcastToDashboard({
              type: "volunteer-location",
              data: {
                volunteer_id: clientId,
                location: parsedMessage.location,
                timestamp: new Date().toISOString()
              }
            });
          }
          break;
          
        case "emergency-status-update":
          if (clientType === "volunteers" || clientType === "admin") {
            const emergencyId = parsedMessage.emergency_id;
            const emergency = emergencyStore.get(emergencyId);
            
            if (emergency) {
              emergency.status = parsedMessage.status;
              emergency.updatedAt = new Date().toISOString();
              emergency.updatedBy = clientId || "unknown";
              
              emergencyStore.set(emergencyId, emergency);
              
              broadcastToDashboard({
                type: "emergency-status-update",
                data: emergency
              });
            }
          }
          break;
          
        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;
      }
    } catch (error) {
      console.error("Message parsing error:", error);
    }
  });
  
  // Connection close handler
  ws.on("close", () => {
    console.log(`${clientType} client disconnected`);
    if (clients[clientType]) {
      clients[clientType].delete(ws);
    }
  });
  
  // Error handler
  ws.on("error", (error) => {
    console.error(`WebSocket error for ${clientType}:`, error);
  });
});

// Broadcast utility functions
function broadcastToDashboard(message) {
  clients.dashboard.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function broadcastToVolunteers(message) {
  clients.volunteers.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function broadcastToAdmin(message) {
  clients.admin.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function broadcastToAll(message) {
  [...clients.dashboard, ...clients.volunteers, ...clients.admin].forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Kumbh Mela Emergency WebSocket Server",
    version: "1.0.0",
    activeEmergencies: emergencyStore.size,
    connectedClients: {
      dashboard: clients.dashboard.size,
      volunteers: clients.volunteers.size,
      admin: clients.admin.size,
      total: clients.dashboard.size + clients.volunteers.size + clients.admin.size
    },
    features: [
      "Emergency WebSocket Broadcasting",
      "FastAPI Integration", 
      "Twilio Voice Analysis",
      "Real-time Dashboard Updates",
      "Volunteer Management",
      "Emergency Status Tracking"
    ]
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log("🚨 Kumbh Mela Emergency WebSocket Server");
  console.log("=" * 50);
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`🔗 WebSocket URL: ws://localhost:${PORT}`);
  console.log(`📊 Dashboard: ws://localhost:${PORT}?type=dashboard`);
  console.log(`👨‍🚒 Volunteers: ws://localhost:${PORT}?type=volunteers&id=VOLUNTEER_ID`);
  console.log(`👑 Admin: ws://localhost:${PORT}?type=admin`);
  console.log();
  console.log("📋 Available Endpoints:");
  console.log("   ├── POST /fastapi-webhook (FastAPI integration)");
  console.log("   ├── POST /twilio-webhook (Twilio voice analysis)"); 
  console.log("   ├── GET /api/emergencies (List all emergencies)");
  console.log("   ├── PUT /api/emergencies/:id/status (Update status)");
  console.log("   ├── POST /api/emergencies/:id/resolve (Mark resolved)");
  console.log("   ├── POST /api/volunteers/:id/assign (Assign volunteer)");
  console.log("   ├── GET /api/dashboard/summary (Dashboard data)");
  console.log("   └── GET /health (Health check)");
  console.log("=" * 50);
  
  if (!process.env.GEMINI_API_KEY) {
    console.log("⚠️  WARNING: GEMINI_API_KEY not set - AI analysis disabled");
  }
  
  if (!process.env.FASTAPI_URL) {
    console.log("ℹ️  INFO: FASTAPI_URL not set - using default http://localhost:5000");
  }
  
  console.log("✅ WebSocket server ready for emergency management!");
});