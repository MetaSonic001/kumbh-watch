from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect, HTTPException, Form, Depends
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Set
import asyncio
import json
import os
import time
import re
import logging
from datetime import datetime
from dotenv import load_dotenv
import chromadb
import requests
from chromadb.utils import embedding_functions
import uvicorn
from twilio.twiml.voice_response import VoiceResponse, Gather

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = "llama3-8b-8192"
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
DASHBOARD_WEBHOOK_URL = os.environ.get("DASHBOARD_WEBHOOK_URL")

# Pydantic models
class EmergencyInfo(BaseModel):
    type: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    caller_contact: Optional[str] = None
    priority: str = "medium"
    status: str = "active"
    landmarks: List[str] = []
    person_description: Optional[str] = None
    time_reported: float

class EmergencySession(BaseModel):
    emergency_info: EmergencyInfo
    stage: str = "greeting"
    conversation_history: List[Dict] = []
    attempts: Dict[str, int] = {"location": 0, "details": 0}

class EmergencyAlert(BaseModel):
    id: str
    timestamp: str
    type: str
    location: str
    description: str
    priority: str
    status: str
    contact: Optional[str] = None

class EmergencyUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    volunteer_assigned: Optional[str] = None

# FastAPI app
app = FastAPI(
    title="Kumbhh Mela Emergency Voice Agent",
    description="Emergency response system for Kumbh Mela with voice assistance and real-time alerts",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
class AppState:
    def __init__(self):
        self.sessions: Dict[str, EmergencySession] = {}
        self.active_emergencies: Dict[str, EmergencyAlert] = {}
        self.websocket_connections: Set[WebSocket] = set()
        self.collection = None
        
    async def broadcast_alert(self, alert: EmergencyAlert):
        """Broadcast emergency alert to all connected WebSocket clients"""
        if self.websocket_connections:
            disconnected = set()
            for websocket in self.websocket_connections:
                try:
                    await websocket.send_text(json.dumps({
                        "type": "EMERGENCY_ALERT",
                        "data": alert.dict(),
                        "timestamp": datetime.now().isoformat()
                    }))
                except:
                    disconnected.add(websocket)
            
            # Remove disconnected clients
            self.websocket_connections -= disconnected

state = AppState()

# Initialize ChromaDB
@app.on_event("startup")
async def startup_event():
    """Initialize ChromaDB and other startup tasks"""
    try:
        client = chromadb.PersistentClient("./kumbh_mela_chroma_db")
        embedding_function = embedding_functions.DefaultEmbeddingFunction()
        
        try:
            state.collection = client.get_collection(
                name="kumbh_mela_emergency",
                embedding_function=embedding_function
            )
            logger.info("Connected to existing Kumbh Mela emergency knowledge base")
        except:
            state.collection = client.create_collection(
                name="kumbh_mela_emergency",
                embedding_function=embedding_function
            )
            logger.info("Created new emergency knowledge base")
            
    except Exception as e:
        logger.error(f"ChromaDB initialization failed: {e}")

def get_or_create_session(call_sid: str) -> EmergencySession:
    """Create or retrieve emergency session"""
    if call_sid not in state.sessions:
        state.sessions[call_sid] = EmergencySession(
            emergency_info=EmergencyInfo(time_reported=time.time()),
            stage="greeting",
            conversation_history=[],
            attempts={"location": 0, "details": 0}
        )
    return state.sessions[call_sid]

def detect_emergency_type(query: str) -> Optional[str]:
    """Detect emergency type from user input"""
    query_lower = query.lower()
    
    emergency_patterns = {
        "lost_child": ["child", "kid", "boy", "girl", "son", "daughter", "बच्चा", "लड़का", "लड़की", "baby"],
        "lost_adult": ["lost", "can't find", "missing", "separated", "गुम", "खो गया", "where is"],
        "medical": ["sick", "injured", "fainted", "unconscious", "breathing", "chest pain", "heart", "बीमार", "चोट", "doctor", "hospital"],
        "fire": ["fire", "smoke", "burning", "आग", "धुआं", "flames"],
        "crowd": ["crowd", "pushing", "stampede", "crush", "stuck", "भीड़", "भगदड़", "trapped"],
        "security": ["theft", "harassment", "fighting", "stolen", "चोरी", "लड़ाई", "violence"],
        "water": ["water", "river", "drowning", "fell in", "पानी", "नदी", "गंगा"]
    }
    
    for emerg_type, keywords in emergency_patterns.items():
        if any(keyword in query_lower for keyword in keywords):
            return emerg_type
    return None

def extract_location(query: str) -> Optional[str]:
    """Extract location from user input"""
    query_lower = query.lower()
    
    # Kumbh-specific locations with priority order
    priority_locations = [
        "ramkund", "triveni sangam", "kalaram temple", "nashik road",
        "godavari ghat", "main ghat", "central area"
    ]
    
    zone_locations = [
        "red zone", "blue zone", "green zone", "yellow zone", "orange zone"
    ]
    
    gate_locations = [
        f"gate {i}" for i in range(1, 21)  # Gates 1-20
    ]
    
    sector_locations = [
        f"sector {letter}" for letter in "abcdefghijklmnop"
    ]
    
    facility_locations = [
        "parking area", "main road", "helicopter pad", "medical post", 
        "police post", "control room", "food court", "toilet block"
    ]
    
    all_locations = priority_locations + zone_locations + gate_locations + sector_locations + facility_locations
    
    # Check for exact location matches
    for location in all_locations:
        if location in query_lower:
            return location
    
    # Extract gate/zone/sector numbers with regex
    patterns = [
        (r'\b(?:gate|गेट)\s*(\d+)\b', lambda m: f"gate {m.group(1)}"),
        (r'\b(?:zone|जोन)\s*([a-zA-Z]+)\b', lambda m: f"{m.group(1).lower()} zone"),
        (r'\b(?:sector|सेक्टर)\s*([a-zA-Z])\b', lambda m: f"sector {m.group(1).lower()}")
    ]
    
    for pattern, formatter in patterns:
        match = re.search(pattern, query_lower)
        if match:
            return formatter(match)
    
    # Look for landmarks with context
    landmark_indicators = ["near", "at", "by", "next to", "close to", "पास", "के नजदीक"]
    for indicator in landmark_indicators:
        if indicator in query_lower:
            words = query_lower.split()
            try:
                idx = words.index(indicator)
                if idx < len(words) - 1:
                    potential_location = " ".join(words[idx+1:idx+3])  # Get next 1-2 words
                    if len(potential_location.strip()) > 2:
                        return potential_location.strip()
            except ValueError:
                continue
    
    return None

async def get_emergency_response(query: str, session: EmergencySession, call_sid: str) -> str:
    """Generate contextual emergency response"""
    try:
        stage = session.stage
        emergency_info = session.emergency_info
        
        # Query knowledge base if available
        context = ""
        if state.collection:
            try:
                results = state.collection.query(
                    query_texts=[f"kumbh mela emergency {query}"],
                    n_results=2
                )
                if results['documents']:
                    context = " ".join(results['documents'][0][:2])  # Use top 2 results
            except Exception as e:
                logger.warning(f"ChromaDB query failed: {e}")
        
        # Stage-based response logic
        if stage == "greeting":
            session.stage = "details"
            return "Emergency helpline, I'm here to help. What's happening? Stay calm."
            
        elif stage == "details":
            emergency_type = detect_emergency_type(query)
            if emergency_type:
                emergency_info.type = emergency_type
                emergency_info.description = query
                session.stage = "location"
                return get_detail_response(emergency_type)
            else:
                session.attempts["details"] += 1
                if session.attempts["details"] > 2:
                    session.stage = "location"
                    emergency_info.type = "general_emergency"
                    return "I understand you need help. Where are you right now? Any gate number or zone color?"
                return "Can you tell me exactly what happened? Are you lost, hurt, or is there danger?"
                
        elif stage == "location":
            location = extract_location(query)
            if location:
                emergency_info.location = location
                session.stage = "reassurance"
                
                # Create emergency alert
                alert = EmergencyAlert(
                    id=call_sid,
                    timestamp=datetime.now().isoformat(),
                    type=emergency_info.type or "general_emergency",
                    location=location,
                    description=emergency_info.description or "Emergency reported",
                    priority=determine_priority(emergency_info.type),
                    status="dispatching",
                    contact=emergency_info.caller_contact
                )
                
                state.active_emergencies[call_sid] = alert
                await state.broadcast_alert(alert)
                
                # Send to webhook
                if DASHBOARD_WEBHOOK_URL:
                    try:
                        requests.post(DASHBOARD_WEBHOOK_URL, json=alert.dict(), timeout=3)
                    except:
                        pass
                
                return f"Got it, {location}. A volunteer in an orange vest is coming to you now. {get_safety_instruction(emergency_info.type)} Are you somewhere visible?"
            else:
                session.attempts["location"] += 1
                if session.attempts["location"] > 2:
                    session.stage = "reassurance"
                    emergency_info.location = "location_unclear"
                    return "Help is being sent to your area. Look for any signs, gate numbers, or colored banners around you. Stay where you are."
                return "I need to know where you are. Can you see any gate numbers, zone colors like red or blue, or big landmarks?"
                
        elif stage == "reassurance":
            session.stage = "dispatch"
            return get_reassurance_response(emergency_info)
            
        else:  # dispatch stage
            return "Your volunteer is on the way. Stay exactly where you are and wave if you see orange vests. Anything else urgent?"
        
    except Exception as e:
        logger.error(f"Error in emergency response: {e}")
        return "I'm here to help you. Tell me what's wrong and where you are. Help is coming."

def get_detail_response(emergency_type: str) -> str:
    """Get response based on emergency type"""
    responses = {
        "lost_child": "Your child will be found. What do they look like and what clothes are they wearing? Where are you now?",
        "lost_adult": "We'll help find them. Describe the person and tell me your exact location.",
        "medical": "Medical help is coming fast. Keep them comfortable and tell me where you are.",
        "fire": "Fire team is being alerted. Move away from smoke and tell me your location immediately.",
        "crowd": "Stay calm, help is coming. Try to move slowly to the sides. What's your exact location?",
        "security": "Security is coming. Stay around other people. Where are you exactly?",
        "water": "Are you safe from water now? Tell me your exact location."
    }
    return responses.get(emergency_type, "Help is coming. Where are you located?")

def get_safety_instruction(emergency_type: str) -> str:
    """Get safety instruction based on emergency type"""
    instructions = {
        "lost_child": "Stay exactly where you are so your child can find you.",
        "lost_adult": "Stay in a visible, safe area.",
        "medical": "Don't move the person unless it's dangerous to stay.",
        "fire": "Stay away from smoke and move to open areas.",
        "crowd": "Move slowly to the edges, don't push back.",
        "security": "Stay with other people in public view.",
        "water": "Stay away from all water areas."
    }
    return instructions.get(emergency_type, "Stay calm and stay visible.")

def get_reassurance_response(emergency_info: EmergencyInfo) -> str:
    """Provide final reassurance"""
    location = emergency_info.location or "your area"
    return f"Perfect. Volunteers are heading to {location} right now. You're doing great - help will be there very soon. Look for orange vests and wave."

def determine_priority(emergency_type: str) -> str:
    """Determine emergency priority"""
    high_priority = ["medical", "fire", "water", "crowd"]
    medium_priority = ["lost_child", "security"]
    
    if emergency_type in high_priority:
        return "high"
    elif emergency_type in medium_priority:
        return "medium"
    return "low"

# WebSocket endpoint for real-time alerts
@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """WebSocket endpoint for real-time emergency alerts"""
    await websocket.accept()
    state.websocket_connections.add(websocket)
    
    try:
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to emergency alerts stream",
            "timestamp": datetime.now().isoformat(),
            "active_emergencies": len(state.active_emergencies)
        }))
        
        # Keep connection alive with heartbeat
        while True:
            try:
                await asyncio.sleep(30)
                await websocket.send_text(json.dumps({
                    "type": "HEARTBEAT",
                    "timestamp": datetime.now().isoformat(),
                    "active_emergencies": len(state.active_emergencies),
                    "connected_clients": len(state.websocket_connections)
                }))
            except WebSocketDisconnect:
                break
    except WebSocketDisconnect:
        pass
    finally:
        state.websocket_connections.discard(websocket)

# Twilio voice endpoints
@app.post("/voice", response_class=Response)
async def handle_voice_call(request: Request):
    """Handle incoming Twilio voice calls"""
    form_data = await request.form()
    call_sid = form_data.get("CallSid")
    caller_number = form_data.get("From")
    
    logger.info(f"Incoming call: {call_sid} from {caller_number}")
    
    session = get_or_create_session(call_sid)
    session.emergency_info.caller_contact = caller_number
    
    response = VoiceResponse()
    response.say("Emergency helpline. What's your emergency?", voice="alice", language="en-US")
    
    gather = Gather(
        input="speech",
        action="/process_speech",
        method="POST",
        speechTimeout="auto",
        speechModel="phone_call",
        language="en-US",
        timeout=10
    )
    response.append(gather)
    
    response.say("Please tell me what's happening.")
    response.redirect("/voice")
    
    return Response(str(response), media_type="application/xml")

@app.post("/process_speech", response_class=Response)
async def process_speech_input(request: Request):
    """Process speech input from Twilio"""
    form_data = await request.form()
    call_sid = form_data.get("CallSid")
    speech_result = form_data.get("SpeechResult")
    
    if not call_sid or not speech_result:
        response = VoiceResponse()
        response.say("I couldn't hear you. Please speak clearly and tell me your emergency.")
        response.redirect("/voice")
        return Response(str(response), media_type="application/xml")
    
    session = get_or_create_session(call_sid)
    
    # Add to conversation history
    session.conversation_history.append({
        "user": speech_result,
        "timestamp": time.time()
    })
    
    # Get AI response
    agent_response = await get_emergency_response(speech_result, session, call_sid)
    
    # Add AI response to history
    session.conversation_history.append({
        "assistant": agent_response,
        "timestamp": time.time()
    })
    
    response = VoiceResponse()
    response.say(agent_response, voice="alice", language="en-US")
    
    # Continue conversation unless ending phrases detected
    end_phrases = ["goodbye", "bye", "thank you", "that's all", "hang up"]
    if not any(phrase in speech_result.lower() for phrase in end_phrases):
        gather = Gather(
            input="speech",
            action="/process_speech",
            method="POST",
            speechTimeout="auto",
            speechModel="phone_call",
            language="en-US",
            timeout=15
        )
        response.append(gather)
        
        # Contextual fallback message
        if session.stage == "details":
            response.say("Tell me more about what happened.")
        elif session.stage == "location":
            response.say("What can you see around you? Any signs or gate numbers?")
        else:
            response.say("Anything else I need to know?")
        
        response.redirect("/process_speech")
    else:
        response.say("Stay safe. Help is coming.")
        response.hangup()
    
    return Response(str(response), media_type="application/xml")

# REST API endpoints
@app.get("/emergencies", response_model=List[EmergencyAlert])
async def get_active_emergencies():
    """Get all active emergencies"""
    return list(state.active_emergencies.values())

@app.get("/emergencies/{emergency_id}", response_model=EmergencyAlert)
async def get_emergency(emergency_id: str):
    """Get specific emergency details"""
    if emergency_id not in state.active_emergencies:
        raise HTTPException(status_code=404, detail="Emergency not found")
    return state.active_emergencies[emergency_id]

@app.put("/emergencies/{emergency_id}")
async def update_emergency_status(emergency_id: str, update: EmergencyUpdate):
    """Update emergency status"""
    if emergency_id not in state.active_emergencies:
        raise HTTPException(status_code=404, detail="Emergency not found")
    
    alert = state.active_emergencies[emergency_id]
    
    if update.status:
        alert.status = update.status
    if update.volunteer_assigned:
        # Add volunteer info to alert
        setattr(alert, 'volunteer_assigned', update.volunteer_assigned)
    
    # Broadcast update
    await state.broadcast_alert(alert)
    
    return {"status": "updated", "emergency": alert}

@app.post("/test_emergency")
async def create_test_emergency():
    """Create a test emergency for testing"""
    test_alert = EmergencyAlert(
        id=f"test_{int(time.time())}",
        timestamp=datetime.now().isoformat(),
        type="lost_child",
        location="gate 5",
        description="Test emergency - child missing",
        priority="medium",
        status="active",
        contact="+1234567890"
    )
    
    state.active_emergencies[test_alert.id] = test_alert
    await state.broadcast_alert(test_alert)
    
    return {"message": "Test emergency created", "emergency": test_alert}

# Test interface
@app.get("/test", response_class=HTMLResponse)
async def test_interface():
    """Test interface for emergency conversations"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>🚨 Kumbh Mela Emergency Agent</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh; padding: 20px;
            }
            .container { 
                max-width: 900px; margin: 0 auto; 
                background: white; border-radius: 15px; 
                padding: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            }
            h1 { color: #d32f2f; margin-bottom: 20px; text-align: center; }
            .form-group { margin: 20px 0; }
            input, button { 
                width: 100%; padding: 15px; border: 2px solid #ddd; 
                border-radius: 8px; font-size: 16px; 
            }
            button { 
                background: #d32f2f; color: white; border: none; 
                cursor: pointer; font-weight: bold; 
                transition: background 0.3s;
            }
            button:hover { background: #b71c1c; }
            .response { 
                background: #e3f2fd; padding: 20px; margin: 15px 0; 
                border-radius: 8px; border-left: 5px solid #2196f3; 
            }
            .emergency { background: #ffebee; border-left-color: #f44336; }
            .scenarios { 
                display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                gap: 15px; margin: 20px 0; 
            }
            .scenario { 
                background: #f8f9fa; padding: 15px; border-radius: 8px; 
                cursor: pointer; border: 2px solid transparent; 
                transition: all 0.3s;
            }
            .scenario:hover { border-color: #d32f2f; background: #fff; }
            .status { 
                background: #e8f5e8; padding: 15px; border-radius: 8px; 
                margin: 20px 0; text-align: center; 
            }
            .websocket-status {
                display: inline-block;
                width: 12px; height: 12px;
                border-radius: 50%;
                background: #f44336;
                margin-right: 8px;
            }
            .websocket-status.connected { background: #4caf50; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚨 Kumbh Mela Emergency Response System</h1>
            
            <div class="status">
                <span class="websocket-status" id="wsStatus"></span>
                <span id="wsStatusText">Connecting to alerts...</span>
            </div>
            
            <div class="form-group">
                <input type="text" id="userInput" placeholder="Describe your emergency..." />
                <button onclick="sendEmergency()" style="margin-top: 10px;">🚨 Send Emergency Report</button>
            </div>
            
            <div id="response"></div>
            
            <h3>🎭 Test Emergency Scenarios</h3>
            <div class="scenarios">
                <div class="scenario" onclick="testScenario('Help! I lost my 5-year-old son near gate 3. He was wearing a red shirt.')">
                    👶 <strong>Lost Child</strong><br>
                    Child missing near gate with description
                </div>
                <div class="scenario" onclick="testScenario('There is a big fire in the red zone near ramkund. Smoke everywhere!')">
                    🔥 <strong>Fire Emergency</strong><br>
                    Fire reported in specific zone
                </div>
                <div class="scenario" onclick="testScenario('Someone collapsed unconscious at kalaram temple. Need doctor urgently!')">
                    🏥 <strong>Medical Emergency</strong><br>
                    Medical situation at landmark
                </div>
                <div class="scenario" onclick="testScenario('I am lost and cannot find my group. I am somewhere in the blue zone.')">
                    🗺️ <strong>Lost Person</strong><br>
                    Adult separated from group
                </div>
                <div class="scenario" onclick="testScenario('Too much crowd pushing near the main ghat. People are getting crushed!')">
                    👥 <strong>Crowd Control</strong><br>
                    Dangerous crowd situation
                </div>
                <div class="scenario" onclick="testScenario('Someone stole my bag and phone at sector C. Need help!')">
                    🚔 <strong>Security Issue</strong><br>
                    Theft or security concern
                </div>
            </div>
        </div>

        <script>
            let ws = null;
            
            function connectWebSocket() {
                const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
                ws = new WebSocket(`${protocol}//${location.host}/ws/alerts`);
                
                ws.onopen = function() {
                    document.getElementById('wsStatus').className = 'websocket-status connected';
                    document.getElementById('wsStatusText').textContent = 'Connected to real-time alerts';
                };
                
                ws.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    if (data.type === 'EMERGENCY_ALERT') {
                        showAlert(data.data);
                    }
                };
                
                ws.onclose = function() {
                    document.getElementById('wsStatus').className = 'websocket-status';
                    document.getElementById('wsStatusText').textContent = 'Reconnecting...';
                    setTimeout(connectWebSocket, 3000);
                };
            }
            
            function showAlert(emergency) {
                const alertDiv = document.createElement('div');
                alertDiv.className = 'response emergency';
                alertDiv.innerHTML = `
                    <strong>🚨 EMERGENCY ALERT</strong><br>
                    <strong>Type:</strong> ${emergency.type}<br>
                    <strong>Location:</strong> ${emergency.location}<br>
                    <strong>Priority:</strong> ${emergency.priority.toUpperCase()}<br>
                    <strong>Time:</strong> ${new Date(emergency.timestamp).toLocaleTimeString()}
                `;
                document.getElementById('response').appendChild(alertDiv);
            }
            
            async function sendEmergency() {
                const input = document.getElementById('userInput');
                const userInput = input.value.trim();
                if (!userInput) return;
                
                const formData = new FormData();
                formData.append('user_input', userInput);
                
                try {
                    const response = await fetch('/test_conversation', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    
                    const responseDiv = document.createElement('div');
                    responseDiv.className = 'response';
                    responseDiv.innerHTML = `
                        <strong>You:</strong> ${userInput}<br>
                        <strong>Agent:</strong> ${data.response}<br>
                        <small><strong>Stage:</strong> ${data.stage} | <strong>Emergency Type:</strong> ${data.emergency_info.type || 'Detecting...'} | <strong>Location:</strong> ${data.emergency_info.location || 'Unknown'}</small>
                    `;
                    
                    document.getElementById('response').appendChild(responseDiv);
                    input.value = '';
                    input.focus();
                    
                } catch (error) {
                    console.error('Error:', error);
                }
            }
            
            function testScenario(scenario) {
                document.getElementById('userInput').value = scenario;
                sendEmergency();
            }
            
            document.getElementById('userInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') sendEmergency();
            });
            
            // Connect WebSocket on load
            connectWebSocket();
        </script>
    </body>
    </html>
    """

@app.post("/test_conversation")
async def test_conversation(user_input: str = Form(...)):
    """Test conversation endpoint"""
    session = get_or_create_session("test_session")
    response = await get_emergency_response(user_input, session, "test_session")
    
    return {
        "response": response,
        "emergency_info": session.emergency_info,
        "stage": session.stage,
        "conversation_length": len(session.conversation_history)
    }

@app.get("/status")
async def get_system_status():
    """Get system status"""
    return {
        "status": "operational",
        "service": "Kumbh Mela Emergency Voice Agent (FastAPI)",
        "version": "2.0.0",
        "active_emergencies": len(state.active_emergencies),
        "active_sessions": len(state.sessions),
        "websocket_connections": len(state.websocket_connections),
        "components": {
            "twilio": "configured" if TWILIO_ACCOUNT_SID else "not_configured",
            "groq_api": "configured" if GROQ_API_KEY else "not_configured",
            "chromadb": "connected" if state.collection else "failed",
            "websockets": f"active ({len(state.websocket_connections)} clients)",
            "dashboard_webhook": "configured" if DASHBOARD_WEBHOOK_URL else "not_configured"
        },
        "capabilities": [
            "Real-time voice emergency response",
            "Multi-language support (Hindi/English)",
            "Location-based emergency dispatch",
            "WebSocket real-time alerts",
            "Emergency type classification",
            "Volunteer coordination",
            "Priority-based response"
        ],
        "emergency_types": [
            "lost_child", "lost_adult", "medical", "fire", 
            "crowd", "security", "water"
        ],
        "supported_locations": [
            "Gates 1-20", "Red/Blue/Green/Yellow zones",
            "Ramkund", "Triveni Sangam", "Kalaram Temple",
            "Sectors A-P", "Medical posts", "Control rooms"
        ],
        "endpoints": {
            "voice": "/voice (POST - Twilio webhook)",
            "process_speech": "/process_speech (POST - Twilio webhook)",
            "websocket_alerts": "/ws/alerts (WebSocket)",
            "emergencies": "/emergencies (GET - Active emergencies)",
            "test": "/test (GET - Test interface)",
            "status": "/status (GET - This endpoint)"
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Kumbh Mela Emergency Agent"
    }

# Emergency management endpoints
@app.post("/emergencies/{emergency_id}/resolve")
async def resolve_emergency(emergency_id: str):
    """Mark emergency as resolved"""
    if emergency_id not in state.active_emergencies:
        raise HTTPException(status_code=404, detail="Emergency not found")
    
    alert = state.active_emergencies[emergency_id]
    alert.status = "resolved"
    
    # Broadcast resolution
    await state.broadcast_alert(alert)
    
    # Remove from active emergencies after broadcasting
    del state.active_emergencies[emergency_id]
    
    return {"status": "resolved", "emergency_id": emergency_id}

@app.post("/emergencies/{emergency_id}/assign_volunteer")
async def assign_volunteer(emergency_id: str, volunteer_id: str = Form(...)):
    """Assign volunteer to emergency"""
    if emergency_id not in state.active_emergencies:
        raise HTTPException(status_code=404, detail="Emergency not found")
    
    alert = state.active_emergencies[emergency_id]
    alert.status = "volunteer_assigned"
    setattr(alert, 'volunteer_assigned', volunteer_id)
    setattr(alert, 'assigned_at', datetime.now().isoformat())
    
    await state.broadcast_alert(alert)
    
    return {
        "status": "volunteer_assigned",
        "emergency_id": emergency_id,
        "volunteer_id": volunteer_id
    }

# Bulk operations
@app.get("/dashboard/summary")
async def get_dashboard_summary():
    """Get dashboard summary data"""
    now = time.time()
    hour_ago = now - 3600
    
    # Count emergencies by type and time
    recent_emergencies = [
        alert for alert in state.active_emergencies.values()
        if datetime.fromisoformat(alert.timestamp.replace('Z', '+00:00')).timestamp() > hour_ago
    ]
    
    emergency_counts = {}
    priority_counts = {"high": 0, "medium": 0, "low": 0}
    status_counts = {}
    
    for alert in state.active_emergencies.values():
        # Count by type
        emergency_counts[alert.type] = emergency_counts.get(alert.type, 0) + 1
        
        # Count by priority
        priority_counts[alert.priority] = priority_counts.get(alert.priority, 0) + 1
        
        # Count by status
        status_counts[alert.status] = status_counts.get(alert.status, 0) + 1
    
    return {
        "total_active": len(state.active_emergencies),
        "recent_hour": len(recent_emergencies),
        "emergency_types": emergency_counts,
        "priority_distribution": priority_counts,
        "status_distribution": status_counts,
        "active_sessions": len(state.sessions),
        "connected_clients": len(state.websocket_connections),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/broadcast/announcement")
async def broadcast_announcement(message: str = Form(...), priority: str = Form("medium")):
    """Broadcast announcement to all connected clients"""
    announcement = {
        "type": "ANNOUNCEMENT",
        "message": message,
        "priority": priority,
        "timestamp": datetime.now().isoformat()
    }
    
    disconnected = set()
    for websocket in state.websocket_connections:
        try:
            await websocket.send_text(json.dumps(announcement))
        except:
            disconnected.add(websocket)
    
    # Clean up disconnected clients
    state.websocket_connections -= disconnected
    
    return {
        "status": "broadcasted",
        "message": message,
        "clients_reached": len(state.websocket_connections),
        "clients_disconnected": len(disconnected)
    }

# Advanced WebSocket endpoint for volunteers
@app.websocket("/ws/volunteer/{volunteer_id}")
async def volunteer_websocket(websocket: WebSocket, volunteer_id: str):
    """WebSocket endpoint for individual volunteers"""
    await websocket.accept()
    
    # Store volunteer connection with ID
    if not hasattr(state, 'volunteer_connections'):
        state.volunteer_connections = {}
    
    state.volunteer_connections[volunteer_id] = websocket
    
    try:
        await websocket.send_text(json.dumps({
            "type": "VOLUNTEER_CONNECTED",
            "volunteer_id": volunteer_id,
            "message": f"Volunteer {volunteer_id} connected to emergency system",
            "timestamp": datetime.now().isoformat()
        }))
        
        # Handle incoming messages from volunteer
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle volunteer updates
                if message.get("type") == "STATUS_UPDATE":
                    emergency_id = message.get("emergency_id")
                    if emergency_id in state.active_emergencies:
                        alert = state.active_emergencies[emergency_id]
                        alert.status = message.get("status", alert.status)
                        await state.broadcast_alert(alert)
                
                elif message.get("type") == "LOCATION_UPDATE":
                    # Volunteer location update
                    await state.broadcast_alert({
                        "type": "VOLUNTEER_LOCATION",
                        "volunteer_id": volunteer_id,
                        "location": message.get("location"),
                        "timestamp": datetime.now().isoformat()
                    })
                        
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in volunteer websocket: {e}")
                break
                
    except WebSocketDisconnect:
        pass
    finally:
        if hasattr(state, 'volunteer_connections') and volunteer_id in state.volunteer_connections:
            del state.volunteer_connections[volunteer_id]

# Main application entry point
if __name__ == "__main__":
    print("🚨 Kumbh Mela Emergency Voice Agent (FastAPI)")
    print("=" * 50)
    print("📞 Twilio Voice Integration: Ready")
    print("🤖 AI Backend: Groq + ChromaDB")
    print("🔗 WebSocket Alerts: Active")
    print("📊 Real-time Dashboard: Enabled")
    print("🌐 Use HTTPS ngrok URL for Twilio webhooks")
    print()
    print("📋 Available Endpoints:")
    print("   ├── /voice (Twilio voice webhook)")
    print("   ├── /process_speech (Twilio speech processing)")
    print("   ├── /ws/alerts (Real-time alerts WebSocket)")
    print("   ├── /ws/volunteer/{id} (Volunteer WebSocket)")
    print("   ├── /emergencies (Emergency management API)")
    print("   ├── /test (Interactive test interface)")
    print("   ├── /dashboard/summary (Dashboard data)")
    print("   └── /status (System status)")
    print("=" * 50)
    
    # Validate environment
    missing_vars = []
    if not GROQ_API_KEY:
        missing_vars.append("GROQ_API_KEY")
    if not TWILIO_ACCOUNT_SID:
        missing_vars.append("TWILIO_ACCOUNT_SID")
    if not TWILIO_AUTH_TOKEN:
        missing_vars.append("TWILIO_AUTH_TOKEN")
    
    if missing_vars:
        print(f"⚠️  WARNING: Missing environment variables: {', '.join(missing_vars)}")
        print("   Add these to your .env file for full functionality")
    else:
        print("✅ All environment variables configured")
    
    print("\n🚀 Starting server...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
        log_level="info"
    )