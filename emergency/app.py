# Add this import at the top of the file
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# The rest of your imports
from flask import Flask, request, Response, jsonify, redirect, render_template_string
import os
import json
import chromadb
import requests
import logging
from twilio.twiml.voice_response import VoiceResponse, Gather
from chromadb.utils import embedding_functions
import time
import re
from langdetect import detect, LangDetectException  # For language detection

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
GROQ_MODEL = "llama3-70b-8192"  # Upgraded to larger model for better multilingual support
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")

# Initialize ChromaDB using your existing Kumbh Mela database
try:
    # Use your existing Kumbh Mela ChromaDB
    client = chromadb.PersistentClient("./kumbh_mela_chroma_db")
    logger.info("Using existing Kumbh Mela ChromaDB at ./kumbh_mela_chroma_db")
    
    # Try to get or create the kumbh_mela_emergency collection
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
        logger.warning(f"Could not access 'kumbh_mela_emergency' collection: {e}")
        logger.info("Creating new kumbh_mela_emergency collection")
        collection = client.create_collection(
            name="kumbh_mela_emergency",
            embedding_function=embedding_function,
            metadata={"description": "Kumbh Mela emergency knowledge base"}
        )
        logger.info("Populated kumbh_mela_emergency collection with sample documents")
        
except Exception as e:
    logger.error(f"Could not access Kumbh Mela ChromaDB: {e}")
    logger.info("Falling back to new ChromaDB with basic knowledge at ./voice_agent_fallback_db")
    
    # Fallback to new database
    client = chromadb.PersistentClient("./voice_agent_fallback_db")
    embedding_function = embedding_functions.DefaultEmbeddingFunction()
    
    # Check if the fallback collection already exists
    try:
        collection = client.get_collection(
            name="voice_agent_knowledge",
            embedding_function=embedding_function
        )
        logger.info("Using existing voice_agent_knowledge collection")
    except Exception as e:
        logger.info(f"Creating new voice_agent_knowledge collection: {e}")
        collection = client.create_collection(
            name="voice_agent_knowledge",
            embedding_function=embedding_function,
            metadata={"description": "Voice agent knowledge base (fallback)"}
        )
    
    # Check if the collection is empty and add sample documents if needed
    collection_info = collection.get()
    doc_count = len(collection_info['documents']) if collection_info['documents'] else 0
    if doc_count == 0:
        logger.info("Populating fallback collection with sample documents")
        # Add basic emergency and general knowledge
        sample_documents = [
            "Hello! I'm here to help you with any questions or concerns.",
            "For emergencies, please provide your location and describe what's happening clearly.",
            "I can assist with information, general questions, and emergency guidance.",
            "If you need immediate emergency services, please call your local emergency number like 112.",
            "Stay calm and provide clear information about your situation."
        ]
        
        sample_metadata = [
            {"type": "greeting", "priority": "high"},
            {"type": "emergency", "priority": "high"},
            {"type": "general", "priority": "medium"},
            {"type": "emergency", "priority": "high"},
            {"type": "general", "priority": "medium"}
        ]
        
        collection.add(
            documents=sample_documents,
            metadatas=sample_metadata,
            ids=[f"sample_{i}" for i in range(len(sample_documents))]
        )
        logger.info("Added sample documents to voice_agent_knowledge collection")

# Session storage for tracking conversation state
sessions = {}

def get_or_create_session(call_sid):
    """Create or retrieve a session for the current call"""
    if call_sid not in sessions:
        sessions[call_sid] = {
            "conversation_history": [
                {"role": "system", "content": "You are a helpful, multilingual voice assistant with knowledge about Kumbh Mela and emergency services in India. Respond in the user's detected language. You can help with general questions, provide information about emergencies, lost persons, medical situations, crowd safety, and other concerns in multiple Indian languages. Be conversational, clear, concise, and to the point. Keep responses under 2 sentences unless more detail is specifically requested. Be friendly, professional, culturally sensitive, and empathetic. If the situation seems serious, suggest calling 112 or nearest authorities."}
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
            "context": "general",  # Can be: general, emergency, kumbh_specific
            "language": "en-IN",  # Default to Indian English
            "voice": "Polly.Aditi-Neural"  # Default natural Indian voice
        }
    return sessions[call_sid]

# Expanded Language to Twilio language/voice mapping for Indian languages
LANGUAGE_MAP = {
    'en': {'language': 'en-IN', 'voice': 'Polly.Aditi-Neural'},  # Indian English
    'hi': {'language': 'hi-IN', 'voice': 'Polly.Kajal-Neural'},  # Hindi
    'mr': {'language': 'mr-IN', 'voice': 'Polly.Aditi-Neural'},  # Marathi (using Hindi voice as fallback)
    'ta': {'language': 'ta-IN', 'voice': 'Polly.Kajal-Neural'},  # Tamil
    'te': {'language': 'te-IN', 'voice': 'Polly.Kajal-Neural'},  # Telugu
    'bn': {'language': 'bn-IN', 'voice': 'Polly.Kajal-Neural'},  # Bengali
    'gu': {'language': 'gu-IN', 'voice': 'Polly.Aditi-Neural'},  # Gujarati
    'kn': {'language': 'kn-IN', 'voice': 'Polly.Kajal-Neural'},  # Kannada
    'ml': {'language': 'ml-IN', 'voice': 'Polly.Kajal-Neural'},  # Malayalam
    'pa': {'language': 'pa-IN', 'voice': 'Polly.Aditi-Neural'},  # Punjabi
    # Add more as needed; fallback to Hindi voice for better Indian accent
}

def detect_language(text):
    """Detect language using langdetect"""
    try:
        lang = detect(text)
        return lang if lang in LANGUAGE_MAP else 'hi'  # Fallback to Hindi for Indian context
    except LangDetectException:
        return 'hi'  # Default to Hindi

def query_rag_system(query, session):
    """Query the RAG system using your existing Kumbh Mela knowledge base"""
    try:
        # Detect if this is an emergency or Kumbh-related query
        query_lower = query.lower()
        emergency_keywords = ["emergency", "help", "urgent", "lost", "missing", "fire", "medical", "accident", "crowd", "stampede", "गुम", "मदद", "आपातकाल", "அவசரம்", "అత్యవసరం"]  # Added more languages
        kumbh_keywords = ["kumbh", "mela", "ramkund", "nashik", "ganga", "akhara", "zone", "sector", "कुंभ", "मेला", "கும்பமேளா", "కుంభమేళా"]
        
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
        
        # Create context-aware prompt with language instruction
        conversation_context = "\n".join([
            f"{msg['role']}: {msg['content']}" 
            for msg in session["conversation_history"][-6:]  # Keep last 6 messages for context
        ])
        
        user_lang = session["language"].split('-')[0]  # e.g., 'hi' from 'hi-IN'
        
        # Determine response style based on context
        if session["context"] == "emergency":
            prompt = f"""You are an emergency response voice assistant with access to Kumbh Mela emergency protocols and general emergency knowledge.

EMERGENCY CONTEXT DETECTED
Available emergency knowledge:
{context}

Recent conversation:
{conversation_context}

Current user query: {query}

Respond in {user_lang} language.

EMERGENCY RESPONSE GUIDELINES:
- Be calm, reassuring, empathetic, and professional
- Ask for location if not provided
- Provide clear, actionable guidance
- Keep responses under 2 sentences for voice clarity and brevity
- If this is a real emergency, advise calling local emergency services (112 in India) or nearest police/medical help
- Use simple, clear language that's easy to understand over phone, considering Indian dialects
- Offer additional help like contacting family or guiding to safe spots

Provide an appropriate emergency response:"""

        elif session["context"] == "kumbh_specific":
            prompt = f"""You are a knowledgeable voice assistant with expertise in Kumbh Mela information, logistics, and guidance.

KUMBH MELA CONTEXT
Available Kumbh knowledge:
{context}

Recent conversation:
{conversation_context}

Current user query: {query}

Respond in {user_lang} language.

KUMBH MELA RESPONSE GUIDELINES:
- Provide helpful information about Kumbh Mela
- Be culturally sensitive, respectful, and inclusive of Indian traditions
- Include practical guidance when relevant (e.g., nearest facilities, transport)
- Mention specific locations (like Ramkund, zones, akharas) when appropriate
- Keep responses conversational and under 2 sentences for voice
- If safety-related, prioritize safety advice and offer more help

Provide helpful Kumbh Mela information:"""

        else:
            prompt = f"""You are a helpful voice assistant speaking with someone over the phone in India.

Available knowledge:
{context}

Recent conversation:
{conversation_context}

Current user query: {query}

Respond in {user_lang} language.

Please provide a helpful, conversational response. Keep it:
- Under 2 sentences unless more detail is needed
- Natural, friendly, and empathetic for voice conversation
- Clear and easy to understand when spoken, using simple Indian English/Hindi if needed
- Relevant to the user's question or request
- Offer additional assistance proactively

If you don't know something specific, acknowledge it honestly and offer to help in other ways or suggest alternatives.

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
                    "temperature": 0.5,  # Lower for more consistent, fluent responses
                    "max_tokens": 150  # Reduced for shorter, concise responses
                },
                timeout=10
            )
            
            if response.status_code == 200:
                response_data = response.json()
                agent_response = response_data["choices"][0]["message"]["content"]
            else:
                logger.error(f"Groq API error: {response.status_code} - {response.text}")
                agent_response = get_fallback_response(session["context"], user_lang)
                
        except requests.exceptions.Timeout:
            logger.error("Groq API timeout")
            agent_response = "I'm processing your request. Could you please repeat that?"
        except requests.exceptions.RequestException as e:
            logger.error(f"Groq API request error: {str(e)}")
            agent_response = get_fallback_response(session["context"], user_lang)
        
        # Update conversation history
        session["conversation_history"].append({"role": "assistant", "content": agent_response})
        
        # Extract and update user information
        update_user_info(query, session)
        
        return agent_response
        
    except Exception as e:
        logger.error(f"Error in RAG query: {str(e)}")
        return get_fallback_response(session.get("context", "general"), session["language"].split('-')[0])

def get_fallback_response(context="general", lang='en'):
    """Provide context-appropriate fallback response in detected language"""
    fallback_responses = {
        "emergency": {
            'en': "I understand this is urgent. Please tell me your location and what's happening so I can better assist you.",
            'hi': "मैं समझता हूं कि यह जरूरी है। कृपया मुझे अपना स्थान और क्या हो रहा है बताएं ताकि मैं आपकी बेहतर मदद कर सकूं।",
            # Add more translations
        },
        "kumbh_specific": {
            'en': "I'm here to help with your Kumbh Mela question. Could you please provide more details about what you need?",
            'hi': "मैं आपके कुंभ मेला के सवाल में मदद करने के लिए यहां हूं। कृपया बताएं कि आपको क्या चाहिए?",
        },
        "general": {
            'en': "I'm here to help you. Could you please tell me what you need assistance with?",
            'hi': "मैं आपकी मदद करने के लिए यहां हूं। कृपया बताएं कि आपको किस चीज में सहायता चाहिए?",
        }
    }
    return fallback_responses.get(context, fallback_responses["general"]).get(lang, fallback_responses["general"]['en'])

def update_user_info(user_input, session):
    """Extract and update user information from conversation"""
    try:
        input_lower = user_input.lower()
        
        # Emergency type detection with more multilingual keywords
        emergency_indicators = {
            "lost_child": ["lost child", "missing child", "can't find my child", "गुम बच्चा", "बच्चा खो गया", "குழந்தை இழந்தது", "పిల్లవాడు కోల్పోయాడు"],
            "lost_adult": ["lost person", "missing person", "can't find", "खो गया", "गुम", "இழந்த நபர்", "కోల్పోయిన వ్యక్తి"],
            "medical": ["medical", "doctor", "hospital", "sick", "injured", "fainted", "unconscious", "बीमार", "डॉक्टर", "மருத்துவ", "వైద్య"],
            "fire": ["fire", "burning", "smoke", "आग", "जल रहा", "தீ", "మంటలు"],
            "crowd": ["crowd", "stampede", "pushing", "crush", "भीड़", "भगदड़", "கூட்டம்", "గుంపు"],
            "security": ["theft", "stolen", "harassment", "चोरी", "गुंडागर्दी", "திருட்டு", "దొంగతనం"],
            "water": ["drowning", "river", "water", "डूब रहा", "पानी", "நீரில் மூழ்குதல்", "నీటిలో మునిగిపోతుంది"]
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
        location_indicators = ["at", "in", "from", "near", "पास", "में", "அருகில்", "దగ్గర"]
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
        urgency_keywords = ["urgent", "emergency", "quickly", "help", "immediately", "तुरंत", "जल्दी", "உடனடி", "తక్షణం"]
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
    
    # Initial greeting with Kumbh Mela awareness, in default language
    greeting = "नमस्ते! मैं आपका वॉयस असिस्टेंट हूं। मैं सामान्य प्रश्नों और कुंभ मेला की जानकारी में मदद कर सकता हूं। आज मैं आपकी कैसे मदद कर सकता हूं?"  # Hindi greeting for Indian context
    response.say(greeting, voice=session["voice"], language=session["language"])
    
    # Gather speech input with enhanced model for conversations and accents
    gather = Gather(
        input="speech",
        action="/process_speech",
        method="POST",
        speechTimeout="auto",
        speechModel="experimental_conversations",  # Better for natural conversations and accents
        language=session["language"]
    )
    response.append(gather)
    
    # Fallback if no speech detected
    response.say("मुझे समझ नहीं आया। कृपया बताएं कि मैं आपकी कैसे मदद कर सकता हूं।", voice=session["voice"], language=session["language"])
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
        response.say("क्षमा करें, कोई त्रुटि हुई है। कृपया फिर से कॉल करें।")
        response.hangup()
        return Response(str(response), mimetype="text/xml")

    session = get_or_create_session(call_sid)
    logger.debug(f"Session state: {json.dumps(session['user_info'], indent=2)}")

    # Get speech input
    speech_result = request.values.get("SpeechResult")
    logger.debug(f"Speech result: {speech_result}")

    if speech_result:
        # Detect language and update session
        detected_lang = detect_language(speech_result)
        if detected_lang in LANGUAGE_MAP:
            session["language"] = LANGUAGE_MAP[detected_lang]['language']
            session["voice"] = LANGUAGE_MAP[detected_lang]['voice']

        # Process through RAG system
        agent_response = query_rag_system(speech_result, session)
        logger.debug(f"Agent response: {agent_response}")
        
        # Respond using Twilio's Say with dynamic voice and language
        response.say(agent_response, voice=session["voice"], language=session["language"])
        
        # Send data to dashboard
        send_to_dashboard(session)
        
        # Check if conversation should continue
        should_continue = should_continue_conversation(speech_result, session)
        
        if should_continue:
            # Continue gathering input with updated language and enhanced model
            gather = Gather(
                input="speech",
                action="/process_speech",
                method="POST",
                speechTimeout="auto",
                speechModel="experimental_conversations",
                language=session["language"]
            )
            response.append(gather)
            
            # Fallback message
            response.say("क्या मैं आपकी और कोई मदद कर सकता हूं?", voice=session["voice"], language=session["language"])
            response.redirect("/process_speech")
        else:
            # End conversation
            response.say("कॉल करने के लिए धन्यवाद। आपका दिन शुभ हो!", voice=session["voice"], language=session["language"])
            response.hangup()
    else:
        # Handle unclear speech
        response.say("मुझे समझ नहीं आया कि आपने क्या कहा। कृपया दोहराएं?", voice=session["voice"], language=session["language"])
        
        gather = Gather(
            input="speech",
            action="/process_speech",
            method="POST",
            speechTimeout="auto",
            speechModel="experimental_conversations",
            language=session["language"]
        )
        response.append(gather)
        
        # Final fallback
        response.say("मुझे सुनने में समस्या हो रही है। कृपया वापस कॉल करें।", voice=session["voice"], language=session["language"])
        response.hangup()
    
    return Response(str(response), mimetype="text/xml")

def should_continue_conversation(speech_result, session):
    """Determine if conversation should continue based on user input"""
    if not speech_result:
        return False
        
    # End conversation indicators with multilingual support
    end_phrases = [
        "goodbye", "bye", "thank you", "thanks", "that's all", 
        "nothing else", "no more questions", "hang up", "end call",
        "अलविदा", "धन्यवाद", "बस इतना ही", "குட்பை", "நன்றி", "గుడ్బై", "ధన్యవాదాలు"
    ]
    
    speech_lower = speech_result.lower()
    
    # Check for end phrases
    if any(phrase in speech_lower for phrase in end_phrases):
        return False
    
    # Continue if conversation is recent (less than 10 exchanges)
    if len(session["conversation_history"]) < 10:
        return True
        
    # Continue if user is asking questions
    question_indicators = ["what", "how", "when", "where", "why", "can you", "could you", "क्या", "कैसे", "कब", "कहां", "என்ன", "எப்படி", "எப்போது", "ఏమి", "ఎలా", "ఎప్పుడు"]
    if any(indicator in speech_lower for indicator in question_indicators):
        return True
    
    return True  # Default to continuing conversation

def send_to_dashboard(session):
    """Send conversation data to dashboard (REST webhook)"""
    try:
        payload = {
            "id": session.get("call_sid", f"call-{int(time.time())}"),
            "timestamp": time.time(),
            "conversation": session["conversation_history"],
            "user_info": session["user_info"],
            "language": session["language"]
        }
        
        # Attempt to send to dashboard via REST POST
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

# New admin route for HTML
@app.route("/admin", methods=["GET"])
def admin():
    """Admin page to view emergency calls (HTML)"""
    emergency_sessions = []
    for call_sid, session in sessions.items():
        if session["context"] == "emergency":
            emergency_sessions.append({
                "call_sid": call_sid,
                "caller": session["user_info"]["caller_contact"],
                "emergency_type": session["user_info"]["emergency_type"],
                "location": session["user_info"]["location"],
                "situation": session["user_info"]["situation"],
                "priority": session["user_info"]["priority_level"],
                "language": session["language"]
            })
    
    # Simple HTML table for admin
    html = """
    <html>
    <head><title>Admin Emergency Portal</title></head>
    <body>
    <h1>Emergency Calls</h1>
    <table border="1">
    <tr><th>Call SID</th><th>Caller</th><th>Type</th><th>Location</th><th>Situation</th><th>Priority</th><th>Language</th><th>Action</th></tr>
    {% for sess in sessions %}
    <tr>
    <td>{{ sess.call_sid }}</td>
    <td>{{ sess.caller }}</td>
    <td>{{ sess.emergency_type }}</td>
    <td>{{ sess.location }}</td>
    <td>{{ sess.situation }}</td>
    <td>{{ sess.priority }}</td>
    <td>{{ sess.language }}</td>
    <td>
    <form action="/send_to_volunteer" method="post">
    <input type="hidden" name="call_sid" value="{{ sess.call_sid }}">
    <input type="hidden" name="location" value="{{ sess.location }}">
    <input type="hidden" name="emergency_type" value="{{ sess.emergency_type }}">
    <input type="hidden" name="situation" value="{{ sess.situation }}">
    <button type="submit">Send to Volunteer</button>
    </form>
    </td>
    </tr>
    {% endfor %}
    </table>
    </body>
    </html>
    """
    return render_template_string(html, sessions=emergency_sessions)

# New JSON endpoint for admin portal
@app.route("/admin-json", methods=["GET"])
def admin_json():
    """JSON endpoint for emergency calls data"""
    emergency_sessions = []
    for call_sid, session in sessions.items():
        if session["context"] == "emergency":
            emergency_sessions.append({
                "call_sid": call_sid,
                "caller": session["user_info"]["caller_contact"],
                "emergency_type": session["user_info"]["emergency_type"],
                "location": session["user_info"]["location"],
                "situation": session["user_info"]["situation"],
                "priority": session["user_info"]["priority_level"],
                "language": session["language"],
                "conversation_history": session["conversation_history"],
                "landmarks_mentioned": session["user_info"]["landmarks_mentioned"]
            })
    return jsonify(emergency_sessions)

@app.route("/send_to_volunteer", methods=["POST"])
def send_to_volunteer():
    """Send key points to volunteer via REST webhook"""
    call_sid = request.form.get("call_sid")
    location = request.form.get("location")
    emergency_type = request.form.get("emergency_type")
    situation = request.form.get("situation")
    
    # Key points (only important: location, distress)
    key_info = {
        "emergency_type": emergency_type,
        "location": location,
        "distress_summary": situation[:100]  # Short summary of distress
    }
    
    # Send via REST POST to volunteer webhook
    volunteer_webhook = os.environ.get("VOLUNTEER_WEBHOOK_URL")
    if volunteer_webhook:
        requests.post(volunteer_webhook, json=key_info)
        logger.info(f"Sent key info to volunteer for call {call_sid}")
    
    return redirect("/admin")

# Testing and status endpoints
@app.route("/test", methods=["GET", "POST"])
def test_endpoint():
    """Test endpoint to simulate conversation without Twilio"""
    if request.method == "POST":
        user_input = request.form.get("user_input")
        if not user_input:
            return jsonify({"error": "No user_input provided"}), 400
            
        test_session = get_or_create_session("test_session")
        response = query_rag_system(user_input, test_session)
        
        return jsonify({
            "response": response,
            "user_info": test_session["user_info"],
            "conversation_length": len(test_session["conversation_history"]),
            "context": test_session.get("context", "general"),
            "detected_emergency_type": test_session["user_info"].get("emergency_type"),
            "detected_location": test_session["user_info"].get("location"),
            "landmarks_mentioned": test_session["user_info"].get("landmarks_mentioned", [])
        })
    
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Voice Agent Test</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            input[type="text"] { width: 400px; padding: 10px; margin: 10px 0; }
            button { padding: 10px 20px; background: #007cba; color: white; border: none; cursor: pointer; }
            .response { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        </style>
    </head>
    <body>
        <h1>Voice Agent Test Interface</h1>
        <form method="post">
            <input type="text" name="user_input" placeholder="Type your message here..." required>
            <br>
            <button type="submit">Send</button>
        </form>
        
        <h3>Sample Test Inputs:</h3>
        <ul>
            <li>"Hello, how are you?"</li>
            <li>"I need help with something"</li>
            <li>"Can you tell me about the weather?"</li>
            <li>"Thank you, goodbye"</li>
        </ul>
    </body>
    </html>
    """

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
            'total_sessions': len(sessions),
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
                "Multilingual support for major Indian languages"
            ],
            "components": {
                "flask_server": "running",
                "chromadb": "connected_to_kumbh_database",
                "groq_api": groq_status,
                "twilio_integration": "configured"
            },
            "active_sessions": len(sessions),
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
                "status": "/status (GET - This endpoint)",
                "admin": "/admin (GET - Admin portal HTML)",
                "admin-json": "/admin-json (GET - Admin portal JSON)",
                "send_to_volunteer": "/send_to_volunteer (POST - Send to volunteer)"
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
    print("   ├── /admin (Admin portal HTML)")
    print("   ├── /admin-json (Admin portal JSON)")
    print("   ├── /send_to_volunteer (Send to volunteer)")
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