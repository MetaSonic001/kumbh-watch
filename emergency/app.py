# Add this import at the top of the file
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# The rest of your imports
from flask import Flask, request, Response, jsonify, redirect
import os
import json
import chromadb
import requests
import logging
from twilio.twiml.voice_response import VoiceResponse, Gather
from chromadb.utils import embedding_functions
import time
import re

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.before_request
def before_request():
    # Force HTTPS for all routes when using ngrok
    if 'ngrok' in request.host and request.headers.get('X-Forwarded-Proto') == 'http':
        url = request.url.replace('http://', 'https://', 1)
        return redirect(url, code=301)

# Configuration
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = "llama3-8b-8192"
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")

# Initialize ChromaDB using the existing Kumbh Mela database
try:
    # Connect to the existing Kumbh Mela ChromaDB
    client = chromadb.PersistentClient("./kumbh_mela_chroma_db")
    logger.info("Connected to existing Kumbh Mela ChromaDB at ./kumbh_mela_chroma_db")
    
    # Get the existing kumbh_mela_emergency collection
    embedding_function = embedding_functions.DefaultEmbeddingFunction()
    
    try:
        collection = client.get_collection(
            name="kumbh_mela_emergency",
            embedding_function=embedding_function
        )
        logger.info("Successfully connected to existing Kumbh Mela emergency knowledge base")
        
        # Get collection stats
        collection_info = collection.get()
        doc_count = len(collection_info['documents']) if collection_info['documents'] else 0
        logger.info(f"Loaded {doc_count} documents from Kumbh Mela knowledge base")
        
    except Exception as e:
        logger.error(f"Could not access 'kumbh_mela_emergency' collection: {e}")
        logger.info("Falling back to a new collection in the same database")
        collection = client.create_collection(
            name="kumbh_mela_emergency",
            embedding_function=embedding_function,
            metadata={"description": "Kumbh Mela emergency response system for Nashik - crowd management and volunteer dispatch"}
        )
        logger.info("Created new kumbh_mela_emergency collection as fallback")
        # Note: We do NOT add sample documents here to avoid overwriting the intended knowledge base
        # If you need to populate it, you should run knowledgebase.py first
        
except Exception as e:
    logger.error(f"Could not access Kumbh Mela ChromaDB: {e}")
    logger.info("Falling back to a new ChromaDB at ./voice_agent_fallback_db")
    
    # Fallback to a new database only if the primary database is completely inaccessible
    client = chromadb.PersistentClient("./voice_agent_fallback_db")
    embedding_function = embedding_functions.DefaultEmbeddingFunction()
    
    try:
        collection = client.get_collection(
            name="kumbh_mela_emergency",
            embedding_function=embedding_function
        )
        logger.info("Using existing kumbh_mela_emergency collection in fallback database")
    except Exception:
        logger.info("Creating new kumbh_mela_emergency collection in fallback database")
        collection = client.create_collection(
            name="kumbh_mela_emergency",
            embedding_function=embedding_function,
            metadata={"description": "Kumbh Mela emergency response system (fallback)"}
        )
        # Note: We do NOT add sample documents here to avoid confusion with the main knowledge base
        logger.warning("Fallback collection created, but it is empty. Run knowledgebase.py to populate it.")

# Session storage for tracking conversation state
sessions = {}

def get_or_create_session(call_sid):
    """Create or retrieve a session for the current call"""
    if call_sid not in sessions:
        sessions[call_sid] = {
            "conversation_history": [
                {"role": "system", "content": "You are a helpful voice assistant with knowledge about Kumbh Mela and emergency services. You can help with general questions, provide information about emergencies, lost persons, medical situations, crowd safety, and other concerns. Be conversational, clear, and concise. Keep responses under 3 sentences unless more detail is specifically requested. Be friendly, professional, and culturally sensitive."}
            ],
            "user_info": {
                "location": None,
                "emergency_type": None,
                "situation": None,
                "caller_contact": None,
                "priority_level": None,
                "landmarks_mentioned": [],
                "complete": False
            },
            "current_step": "initial",
            "context": "general"  # Can be: general, emergency, kumbh_specific
        }
    return sessions[call_sid]

def query_rag_system(query, session):
    """Query the RAG system using your existing Kumbh Mela knowledge base"""
    try:
        # Detect if this is an emergency or Kumbh-related query
        query_lower = query.lower()
        emergency_keywords = ["emergency", "help", "urgent", "lost", "missing", "fire", "medical", "accident", "crowd", "stampede", "गुम", "मदद", "आपातकाल"]
        kumbh_keywords = ["kumbh", "mela", "ramkund", "nashik", "ganga", "akhara", "zone", "sector", "कुंभ", "मेला"]
        
        is_emergency = any(keyword in query_lower for keyword in emergency_keywords)
        is_kumbh_related = any(keyword in query_lower for keyword in kumbh_keywords)
        
        # Update session context
        if is_emergency:
            session["context"] = "emergency"
        elif is_kumbh_related:
            session["context"] = "kumbh_specific"
        
        # Query ChromaDB based on context
        if is_emergency or is_kumbh_related:
            # Use specific filters for emergency/Kumbh queries
            if is_emergency:
                results = collection.query(
                    query_texts=[query],
                    n_results=5,
                    where={"type": {"$in": ["emergency", "lost_child", "medical_crowd", "crowd_safety", "fire_emergency", "water_emergency", "security"]}} if collection.get()['metadatas'] else None
                )
            else:
                results = collection.query(
                    query_texts=[f"kumbh mela {query}"],
                    n_results=4
                )
        else:
            # General query
            results = collection.query(
                query_texts=[query],
                n_results=3
            )
        
        # Extract retrieved documents
        retrieved_docs = results['documents'][0] if results['documents'] else []
        retrieved_metadatas = results['metadatas'][0] if results['metadatas'] else []
        
        # Format retrieved context with metadata
        context_parts = []
        for doc, meta in zip(retrieved_docs, retrieved_metadatas):
            context_part = f"Knowledge: {doc}"
            if meta:
                if 'type' in meta:
                    context_part += f" (Type: {meta['type']})"
                if 'priority' in meta:
                    context_part += f" (Priority: {meta['priority']})"
            context_parts.append(context_part)
        
        context = "\n\n".join(context_parts) if context_parts else "No specific knowledge found for this query."
        
        # Update conversation with user input
        session["conversation_history"].append({"role": "user", "content": query})
        
        # Create context-aware prompt
        conversation_context = "\n".join([
            f"{msg['role']}: {msg['content']}" 
            for msg in session["conversation_history"][-6:]  # Keep last 6 messages for context
        ])
        
        # Determine response style based on context
        if session["context"] == "emergency":
            prompt = f"""You are an emergency response voice assistant with access to Kumbh Mela emergency protocols and general emergency knowledge.

EMERGENCY CONTEXT DETECTED
Available emergency knowledge:
{context}

Recent conversation:
{conversation_context}

Current user query: {query}

EMERGENCY RESPONSE GUIDELINES:
- Be calm, reassuring, and professional
- Ask for location if not provided
- Provide clear, actionable guidance
- Keep responses under 3 sentences for voice clarity
- If this is a real emergency, advise calling local emergency services (112 in India)
- Use simple, clear language that's easy to understand over phone

Provide an appropriate emergency response:"""

        elif session["context"] == "kumbh_specific":
            prompt = f"""You are a knowledgeable voice assistant with expertise in Kumbh Mela information, logistics, and guidance.

KUMBH MELA CONTEXT
Available Kumbh knowledge:
{context}

Recent conversation:
{conversation_context}

Current user query: {query}

KUMBH MELA RESPONSE GUIDELINES:
- Provide helpful information about Kumbh Mela
- Be culturally sensitive and respectful
- Include practical guidance when relevant
- Mention specific locations (like Ramkund, zones, akharas) when appropriate
- Keep responses conversational and under 3 sentences for voice
- If safety-related, prioritize safety advice

Provide helpful Kumbh Mela information:"""

        else:
            prompt = f"""You are a helpful voice assistant speaking with someone over the phone.

Available knowledge:
{context}

Recent conversation:
{conversation_context}

Current user query: {query}

Please provide a helpful, conversational response. Keep it:
- Under 3 sentences unless more detail is needed
- Natural and friendly for voice conversation
- Clear and easy to understand when spoken
- Relevant to the user's question or request

If you don't know something specific, acknowledge it honestly and offer to help in other ways.

Response:"""

        # Call Groq API with enhanced error handling
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.6,  # Slightly lower for more consistent responses
                    "max_tokens": 400
                },
                timeout=10
            )
            
            if response.status_code == 200:
                response_data = response.json()
                agent_response = response_data["choices"][0]["message"]["content"]
            else:
                logger.error(f"Groq API error: {response.status_code} - {response.text}")
                agent_response = get_fallback_response(session["context"])
                
        except requests.exceptions.Timeout:
            logger.error("Groq API timeout")
            agent_response = "I'm processing your request. Could you please repeat that?"
        except requests.exceptions.RequestException as e:
            logger.error(f"Groq API request error: {str(e)}")
            agent_response = get_fallback_response(session["context"])
        
        # Update conversation history
        session["conversation_history"].append({"role": "assistant", "content": agent_response})
        
        # Extract and update user information
        update_user_info(query, session)
        
        return agent_response
        
    except Exception as e:
        logger.error(f"Error in RAG query: {str(e)}")
        return get_fallback_response(session.get("context", "general"))

def get_fallback_response(context="general"):
    """Provide context-appropriate fallback response when AI service fails"""
    fallback_responses = {
        "emergency": "I understand this is urgent. Please tell me your location and what's happening so I can better assist you.",
        "kumbh_specific": "I'm here to help with your Kumbh Mela question. Could you please provide more details about what you need?",
        "general": "I'm here to help you. Could you please tell me what you need assistance with?"
    }
    return fallback_responses.get(context, fallback_responses["general"])

def update_user_info(user_input, session):
    """Extract and update user information from conversation"""
    try:
        input_lower = user_input.lower()
        
        # Emergency type detection
        emergency_indicators = {
            "lost_child": ["lost child", "missing child", "can't find my child", "गुम बच्चा", "बच्चा खो गया"],
            "lost_adult": ["lost person", "missing person", "can't find", "खो गया", "गुम"],
            "medical": ["medical", "doctor", "hospital", "sick", "injured", "fainted", "unconscious", "बीमार", "डॉक्टर"],
            "fire": ["fire", "burning", "smoke", "आग", "जल रहा"],
            "crowd": ["crowd", "stampede", "pushing", "crush", "भीड़", "भगदड़"],
            "security": ["theft", "stolen", "harassment", "चोरी", "गुंडागर्दी"],
            "water": ["drowning", "river", "water", "डूब रहा", "पानी"]
        }
        
        for emerg_type, keywords in emergency_indicators.items():
            if any(keyword in input_lower for keyword in keywords):
                session["user_info"]["emergency_type"] = emerg_type
                break
        
        # Location extraction with Kumbh-specific landmarks
        kumbh_locations = [
            "ramkund", "triveni sangam", "kalaram temple", "niranjani akhara", "juna akhara",
            "red zone", "blue zone", "green zone", "yellow zone", "gate", "sector",
            "central tower", "helicopter area", "medical post", "police post"
        ]
        
        for location in kumbh_locations:
            if location in input_lower:
                session["user_info"]["location"] = location
                if location not in session["user_info"]["landmarks_mentioned"]:
                    session["user_info"]["landmarks_mentioned"].append(location)
        
        # General location extraction
        location_indicators = ["at", "in", "from", "near", "पास", "में"]
        for indicator in location_indicators:
            if indicator in input_lower:
                words = input_lower.split()
                if indicator in words:
                    idx = words.index(indicator)
                    if idx < len(words) - 1:
                        potential_location = words[idx + 1]
                        if len(potential_location) > 2:  # Avoid very short words
                            session["user_info"]["location"] = potential_location
                            break
        
        # Priority assessment
        urgency_keywords = ["urgent", "emergency", "quickly", "help", "immediately", "तुरंत", "जल्दी"]
        if any(keyword in input_lower for keyword in urgency_keywords):
            session["user_info"]["priority_level"] = "high"
        elif session["user_info"]["emergency_type"]:
            session["user_info"]["priority_level"] = "medium"
        
        # Update situation description
        session["user_info"]["situation"] = user_input
        
        # Mark as complete if we have key information
        has_emergency_type = session["user_info"]["emergency_type"] is not None
        has_location = session["user_info"]["location"] is not None
        has_enough_context = len(session["conversation_history"]) > 4
        
        if (has_emergency_type and has_location) or has_enough_context:
            session["user_info"]["complete"] = True
            
    except Exception as e:
        logger.error(f"Error updating user info: {str(e)}")

@app.route("/voice", methods=["POST"])
def voice():
    """Handle incoming calls and start the conversation"""
    logger.debug("===== INCOMING CALL =====")
    logger.debug(f"Request values: {request.values.to_dict()}")
    
    response = VoiceResponse()
    call_sid = request.values.get("CallSid")
    caller_number = request.values.get("From")
    
    logger.debug(f"Call SID: {call_sid}, Caller: {caller_number}")
    
    # Create session
    session = get_or_create_session(call_sid)
    session["user_info"]["caller_contact"] = caller_number
    
    # Initial greeting with Kumbh Mela awareness
    greeting = "Hello! I'm your voice assistant. I can help with general questions and Kumbh Mela information. How can I help you today?"
    response.say(greeting, voice="alice", language="en-US")
    
    # Gather speech input
    gather = Gather(
        input="speech",
        action="/process_speech",
        method="POST",
        speechTimeout="auto",
        speechModel="phone_call",
        language="en-US"
    )
    response.append(gather)
    
    # Fallback if no speech detected
    response.say("I didn't catch that. Please tell me how I can help you.")
    response.redirect("/voice")
    
    return Response(str(response), mimetype="text/xml")

@app.route("/process_speech", methods=["POST"])
def process_speech():
    """Process speech input from the caller"""
    logger.debug("===== PROCESSING SPEECH =====")
    logger.debug(f"Request values: {request.values.to_dict()}")

    response = VoiceResponse()
    call_sid = request.values.get("CallSid")
    
    if not call_sid:
        logger.error("No CallSid provided")
        response.say("I'm sorry, there was an error. Please try calling again.")
        response.hangup()
        return Response(str(response), mimetype="text/xml")

    session = get_or_create_session(call_sid)
    logger.debug(f"Session state: {json.dumps(session['user_info'], indent=2)}")

    # Get speech input
    speech_result = request.values.get("SpeechResult")
    logger.debug(f"Speech result: {speech_result}")

    if speech_result:
        # Process through RAG system
        agent_response = query_rag_system(speech_result, session)
        logger.debug(f"Agent response: {agent_response}")
        
        # Respond using Twilio's Say
        response.say(agent_response, voice="alice", language="en-US")
        
        # Send data to dashboard (optional)
        send_to_dashboard(session)
        
        # Check if conversation should continue
        should_continue = should_continue_conversation(speech_result, session)
        
        if should_continue:
            # Continue gathering input
            gather = Gather(
                input="speech",
                action="/process_speech",
                method="POST",
                speechTimeout="auto",
                speechModel="phone_call",
                language="en-US"
            )
            response.append(gather)
            
            # Fallback message
            response.say("Is there anything else I can help you with?")
            response.redirect("/process_speech")
        else:
            # End conversation
            response.say("Thank you for calling. Have a great day!")
            response.hangup()
    else:
        # Handle unclear speech
        response.say("I couldn't understand what you said. Could you please repeat that?")
        
        gather = Gather(
            input="speech",
            action="/process_speech",
            method="POST",
            speechTimeout="auto",
            speechModel="phone_call",
            language="en-US"
        )
        response.append(gather)
        
        # Final fallback
        response.say("I'm having trouble hearing you. Please try calling back.")
        response.hangup()
    
    return Response(str(response), mimetype="text/xml")

def should_continue_conversation(speech_result, session):
    """Determine if conversation should continue based on user input"""
    if not speech_result:
        return False
        
    # End conversation indicators
    end_phrases = [
        "goodbye", "bye", "thank you", "thanks", "that's all", 
        "nothing else", "no more questions", "hang up", "end call"
    ]
    
    speech_lower = speech_result.lower()
    
    # Check for end phrases
    if any(phrase in speech_lower for phrase in end_phrases):
        return False
    
    # Continue if conversation is recent (less than 10 exchanges)
    if len(session["conversation_history"]) < 10:
        return True
        
    # Continue if user is asking questions
    question_indicators = ["what", "how", "when", "where", "why", "can you", "could you"]
    if any(indicator in speech_lower for indicator in question_indicators):
        return True
    
    return True  # Default to continuing conversation

def send_to_dashboard(session):
    """Send conversation data to dashboard (optional integration)"""
    try:
        payload = {
            "id": session.get("call_sid", f"call-{int(time.time())}"),
            "timestamp": time.time(),
            "conversation": session["conversation_history"],
            "user_info": session["user_info"]
        }
        
        # Attempt to send to dashboard
        dashboard_url = os.environ.get("DASHBOARD_WEBHOOK_URL")
        if dashboard_url:
            response = requests.post(
                dashboard_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            
            if response.status_code == 200:
                logger.info("Successfully sent data to dashboard")
            else:
                logger.warning(f"Dashboard returned status: {response.status_code}")
        else:
            logger.debug("No dashboard URL configured, skipping dashboard update")
                
    except Exception as e:
        logger.error(f"Error sending data to dashboard: {str(e)}")

# Testing and status endpoints
# Test page for WebSocket connections
@app.get("/test", response_class=HTMLResponse)
async def get_test_page():
    """Get test page for WebSocket connections"""
    
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Crowd Detection API Test</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f0f0f0; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
            .section { margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            button { padding: 8px 16px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .log { height: 200px; overflow-y: auto; background: #f8f9fa; padding: 10px; border: 1px solid #ddd; font-family: monospace; font-size: 12px; }
            input, select { padding: 5px; margin: 5px; border: 1px solid #ddd; border-radius: 3px; }
            .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
            .connected { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .disconnected { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
            img { max-width: 100%; height: auto; border: 1px solid #ddd; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚨 Crowd Detection & Disaster Management API Test</h1>
            
            <div class="section">
                <h2>📡 WebSocket Connections</h2>
                <div>
                    <button onclick="connectAlerts()">Connect to Alerts</button>
                    <button onclick="connectFrames()">Connect to Frames</button>
                    <button onclick="connectInstructions()">Connect to Instructions</button>
                    <button onclick="disconnectAll()">Disconnect All</button>
                </div>
                <div id="connection-status" class="status disconnected">Not connected</div>
            </div>
            
            <div class="section">
                <h2>📹 Camera Control</h2>
                <div>
                    <input type="text" id="camera-id" placeholder="Camera ID (e.g., webcam_01)" value="test_camera">
                    <input type="text" id="rtsp-url" placeholder="RTSP URL" value="rtsp://127.0.0.1:8554/live">
                    <input type="number" id="threshold" placeholder="Threshold" value="20" min="1" max="100">
                    <button onclick="startRTSP()">Start RTSP Monitoring</button>
                    <button onclick="stopCamera()">Stop Camera</button>
                </div>
                <div>
                    <input type="file" id="video-file" accept="video/*">
                    <button onclick="uploadVideo()">Process Video</button>
                </div>
                <div>
                    <input type="file" id="image-file" accept="image/*">
                    <button onclick="uploadImage()">Analyze Image</button>
                </div>
            </div>
            
            <div class="section">
                <h2>🚨 Emergency Controls</h2>
                <div>
                    <select id="emergency-type">
                        <option value="MEDICAL">Medical</option>
                        <option value="FIRE">Fire</option>
                        <option value="SECURITY">Security</option>
                        <option value="EVACUATION">Evacuation</option>
                        <option value="OTHER">Other</option>
                    </select>
                    <input type="text" id="emergency-message" placeholder="Emergency message" value="Test emergency alert">
                    <input type="text" id="emergency-location" placeholder="Location" value="Test Location">
                    <button onclick="sendEmergency()">Send Emergency Alert</button>
                </div>
                <div>
                    <input type="text" id="instructions" placeholder="Emergency instructions" value="Please remain calm and follow exit signs">
                    <button onclick="sendInstructions()">Send Instructions</button>
                </div>
            </div>
            
            <div class="section">
                <h2>📊 System Status</h2>
                <button onclick="getStatus()">Get Status</button>
                <div id="status-display"></div>
            </div>
            
            <div class="section">
                <h2>🖼️ Live Feed</h2>
                <div id="live-frame">
                    <p>Connect to frames WebSocket to see live video</p>
                </div>
            </div>
            
            <div class="section">
                <h2>📝 Activity Log</h2>
                <button onclick="clearLog()">Clear Log</button>
                <div id="log" class="log"></div>
            </div>
        </div>

        <script>
            let alertsWs = null;
            let framesWs = null;
            let instructionsWs = null;
            
            function log(message) {
                const logDiv = document.getElementById('log');
                const timestamp = new Date().toLocaleTimeString();
                logDiv.innerHTML += `[${timestamp}] ${message}<br>`;
                logDiv.scrollTop = logDiv.scrollHeight;
            }
            
            function clearLog() {
                document.getElementById('log').innerHTML = '';
            }
            
            function updateConnectionStatus() {
                const status = document.getElementById('connection-status');
                const connected = alertsWs?.readyState === WebSocket.OPEN || 
                                framesWs?.readyState === WebSocket.OPEN || 
                                instructionsWs?.readyState === WebSocket.OPEN;
                
                status.className = connected ? 'status connected' : 'status disconnected';
                status.textContent = connected ? 'Connected to WebSocket(s)' : 'Not connected';
            }
            
            function connectAlerts() {
                if (alertsWs) alertsWs.close();
                alertsWs = new WebSocket('ws://localhost:8000/ws/alerts');
                
                alertsWs.onopen = () => {
                    log('✅ Connected to alerts WebSocket');
                    updateConnectionStatus();
                };
                
                alertsWs.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    log(`📢 Alert: ${data.type} - ${data.message || 'No message'}`);
                    if (data.type === 'LIVE_COUNT_UPDATE') {
                        log(`👥 People count: ${data.current_count} (change: ${data.change >= 0 ? '+' : ''}${data.change})`);
                    }
                };
                
                alertsWs.onclose = () => {
                    log('❌ Alerts WebSocket disconnected');
                    updateConnectionStatus();
                };
                
                alertsWs.onerror = (error) => {
                    log(`❌ Alerts WebSocket error: ${error}`);
                };
            }
            
            function connectFrames() {
                const cameraId = document.getElementById('camera-id').value || 'test_camera';
                if (framesWs) framesWs.close();
                framesWs = new WebSocket(`ws://localhost:8000/ws/frames/${cameraId}`);
                
                framesWs.onopen = () => {
                    log(`✅ Connected to frames WebSocket for camera ${cameraId}`);
                    updateConnectionStatus();
                };
                
                framesWs.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === 'LIVE_FRAME') {
                        const frameDiv = document.getElementById('live-frame');
                        frameDiv.innerHTML = `
                            <h4>Camera: ${data.camera_id} | People: ${data.people_count} | Density: ${data.density_level}</h4>
                            <img src="${data.frame}" alt="Live Frame">
                        `;
                        log(`📹 Frame update: ${data.people_count} people, ${data.density_level} density`);
                    } else {
                        log(`📹 Frame: ${data.type}`);
                    }
                };
                
                framesWs.onclose = () => {
                    log('❌ Frames WebSocket disconnected');
                    updateConnectionStatus();
                };
            }
            
            function connectInstructions() {
                if (instructionsWs) instructionsWs.close();
                instructionsWs = new WebSocket('ws://localhost:8000/ws/instructions');
                
                instructionsWs.onopen = () => {
                    log('✅ Connected to instructions WebSocket');
                    updateConnectionStatus();
                };
                
                instructionsWs.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    log(`📋 Instructions: ${data.instructions || data.type}`);
                };
                
                instructionsWs.onclose = () => {
                    log('❌ Instructions WebSocket disconnected');
                    updateConnectionStatus();
                };
            }
            
            function disconnectAll() {
                if (alertsWs) alertsWs.close();
                if (framesWs) framesWs.close();
                if (instructionsWs) instructionsWs.close();
                log('🔌 Disconnected all WebSockets');
                updateConnectionStatus();
            }
            
            async function startRTSP() {
                const cameraId = document.getElementById('camera-id').value;
                const rtspUrl = document.getElementById('rtsp-url').value;
                const threshold = document.getElementById('threshold').value;
                
                try {
                    const response = await fetch(`/monitor/rtsp?camera_id=${cameraId}&rtsp_url=${encodeURIComponent(rtspUrl)}&threshold=${threshold}`, {
                        method: 'POST'
                    });
                    const result = await response.json();
                    log(`📹 Started RTSP monitoring: ${result.message}`);
                } catch (error) {
                    log(`❌ Error starting RTSP: ${error}`);
                }
            }
            
            async function stopCamera() {
                const cameraId = document.getElementById('camera-id').value;
                try {
                    const response = await fetch(`/camera/${cameraId}/stop`, { method: 'POST' });
                    const result = await response.json();
                    log(`🛑 Stopped camera: ${result.message}`);
                } catch (error) {
                    log(`❌ Error stopping camera: ${error}`);
                }
            }
            
            async function uploadVideo() {
                const fileInput = document.getElementById('video-file');
                const cameraId = document.getElementById('camera-id').value;
                const threshold = document.getElementById('threshold').value;
                
                if (!fileInput.files[0]) {
                    log('❌ Please select a video file');
                    return;
                }
                
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                
                try {
                    const response = await fetch(`/process/video?camera_id=${cameraId}&threshold=${threshold}`, {
                        method: 'POST',
                        body: formData
                    });
                    const result = await response.json();
                    log(`📹 Video processing started: ${result.message}`);
                } catch (error) {
                    log(`❌ Error uploading video: ${error}`);
                }
            }
            
            async function uploadImage() {
                const fileInput = document.getElementById('image-file');
                
                if (!fileInput.files[0]) {
                    log('❌ Please select an image file');
                    return;
                }
                
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                
                try {
                    const response = await fetch('/process/image', {
                        method: 'POST',
                        body: formData
                    });
                    const result = await response.json();
                    log(`📷 Image analysis: ${result.people_count} people detected`);
                    
                    // Show result image
                    const frameDiv = document.getElementById('live-frame');
                    frameDiv.innerHTML = `
                        <h4>Image Analysis Result: ${result.people_count} people detected</h4>
                        <img src="${result.annotated_image}" alt="Analyzed Image">
                    `;
                } catch (error) {
                    log(`❌ Error analyzing image: ${error}`);
                }
            }
            
            async function sendEmergency() {
                const type = document.getElementById('emergency-type').value;
                const message = document.getElementById('emergency-message').value;
                const location = document.getElementById('emergency-location').value;
                
                try {
                    const response = await fetch(`/emergency?emergency_type=${type}&message=${encodeURIComponent(message)}&location=${encodeURIComponent(location)}&priority=HIGH`, {
                        method: 'POST'
                    });
                    const result = await response.json();
                    log(`🚨 Emergency alert sent: ${result.message}`);
                } catch (error) {
                    log(`❌ Error sending emergency: ${error}`);
                }
            }
            
            async function sendInstructions() {
                const instructions = document.getElementById('instructions').value;
                
                try {
                    const response = await fetch(`/instructions?instructions=${encodeURIComponent(instructions)}&priority=HIGH`, {
                        method: 'POST'
                    });
                    const result = await response.json();
                    log(`📋 Instructions sent: ${result.message}`);
} catch (error) {
                log(`❌ Error sending instructions: ${error}`);
            }
        }
            
        async function getStatus() {
            try {
                const response = await fetch('/status');
                const result = await response.json();
                    
                document.getElementById('status-display').innerHTML = `
                    <pre>${JSON.stringify(result, null, 2)}</pre>
                `;
                log(`📊 System status retrieved`);
            } catch (error) {
                log(`❌ Error getting status: ${error}`);
            }
        }
            
        // Initialize
        log('🚀 Test page loaded. Connect to WebSockets to start receiving data.');
    </script>
</body>
</html>
"""
    return html_content

@app.route("/status", methods=["GET"])
def status():
    """System status and health check"""
    try:
        # Test ChromaDB and get information about your existing knowledge base
        collection_info = collection.get()
        doc_count = len(collection_info['documents']) if collection_info['documents'] else 0
        
        # Get sample of emergency types from your Kumbh Mela database
        emergency_types = {}
        if doc_count > 0:
            try:
                # Sample query to understand the knowledge base structure
                sample_results = collection.query(query_texts=["emergency"], n_results=5)
                for metadata in sample_results['metadatas'][0]:
                    if metadata and 'type' in metadata:
                        emerg_type = metadata['type']
                        priority = metadata.get('priority', 'medium')
                        if emerg_type not in emergency_types:
                            emergency_types[emerg_type] = {'count': 0, 'priority': priority}
                        emergency_types[emerg_type]['count'] += 1
            except Exception as e:
                logger.warning(f"Could not analyze knowledge base structure: {e}")
        
        # Analyze active sessions for emergency patterns
        session_stats = {
            'total_sessions': active_sessions,
            'emergency_calls': 0,
            'kumbh_related_calls': 0,
            'general_calls': 0,
            'contexts': {'emergency': 0, 'kumbh_specific': 0, 'general': 0}
        }
        
        for session in sessions.values():
            context = session.get('context', 'general')
            session_stats['contexts'][context] = session_stats['contexts'].get(context, 0) + 1
            
            if context == 'emergency':
                session_stats['emergency_calls'] += 1
            elif context == 'kumbh_specific':
                session_stats['kumbh_related_calls'] += 1
            else:
                session_stats['general_calls'] += 1
        
        # Test Groq API
        groq_status = "unknown"
        if GROQ_API_KEY:
            try:
                test_response = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": GROQ_MODEL,
                        "messages": [{"role": "user", "content": "test"}],
                        "max_tokens": 10
                    },
                    timeout=5
                )
                groq_status = "connected" if test_response.status_code == 200 else f"error_{test_response.status_code}"
            except:
                groq_status = "connection_failed"
        else:
            groq_status = "no_api_key"
        
        return jsonify({
            "status": "operational",
            "service": "Voice Chat Agent with Kumbh Mela Knowledge",
            "knowledge_base": {
                "source": "existing Kumbh Mela emergency database",
                "path": "./emergency/kumbh_mela_chroma_db", 
                "documents": doc_count,
                "emergency_types": emergency_types,
                "collection_name": collection.name if hasattr(collection, 'name') else 'unknown'
            },
            "capabilities": [
                "General voice assistance",
                "Kumbh Mela information and guidance", 
                "Emergency response protocols",
                "Lost person assistance",
                "Medical emergency guidance",
                "Crowd safety information",
                "Cultural and religious guidance",
                "Hindi/English language support"
            ],
            "components": {
                "flask_server": "running",
                "chromadb": "connected_to_kumbh_database",
                "groq_api": groq_status,
                "twilio_integration": "configured"
            },
            "active_sessions": active_sessions,
            "session_statistics": session_stats,
            "configuration": {
                "groq_model": GROQ_MODEL,
                "has_groq_key": bool(GROQ_API_KEY),
                "has_twilio_config": bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN)
            },
            "endpoints": {
                "voice": "/voice (POST - Twilio webhook)",
                "process_speech": "/process_speech (POST - Twilio webhook)", 
                "test": "/test (GET/POST - Testing interface)",
                "status": "/status (GET - This endpoint)"
            },
            "timestamp": time.time()
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e),
            "timestamp": time.time()
        }), 500

@app.route("/webhook_test", methods=["POST", "GET"])
def webhook_test():
    """Test webhook for external integrations"""
    return jsonify({
        "status": "success",
        "method": request.method,
        "headers": dict(request.headers),
        "data": request.get_json() if request.is_json else request.form.to_dict(),
        "timestamp": time.time()
    })

# Health check endpoint
@app.route("/health", methods=["GET"])
def health():
    """Simple health check"""
    return jsonify({"status": "healthy", "timestamp": time.time()})

if __name__ == "__main__":
    # Configure for production deployment
    from werkzeug.middleware.proxy_fix import ProxyFix
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1)
    
    print("🎙️  Starting Voice Chat Agent")
    print("📞 Twilio Integration: Ready")
    print("🤖 AI Backend: Groq + ChromaDB")
    print("🌐 Use HTTPS ngrok URL for Twilio webhook")
    print("📋 Endpoints:")
    print("   ├── /voice (Twilio webhook)")
    print("   ├── /process_speech (Twilio webhook)")
    print("   ├── /test (Testing interface)")
    print("   ├── /status (System status)")
    print("   └── /health (Health check)")
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
    
    app.run(debug=True, port=5000)