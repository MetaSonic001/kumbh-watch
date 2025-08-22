import chromadb
import os
import json
from chromadb.utils import embedding_functions
import pandas as pd

# Initialize ChromaDB
client = chromadb.PersistentClient("./kumbh_mela_chroma_db")
embedding_function = embedding_functions.DefaultEmbeddingFunction()

# Delete existing collection if it exists (for clean slate during setup)
try:
    client.delete_collection("kumbh_mela_emergency")
    print("Deleted existing collection")
except:
    print("No existing collection to delete")

# Create collection
collection = client.create_collection(
    name="kumbh_mela_emergency",
    embedding_function=embedding_function,
    metadata={"description": "Kumbh Mela emergency response system for Nashik - crowd management and volunteer dispatch"}
)

# Define Kumbh Mela specific emergency knowledge base
kumbh_mela_knowledge = [
    # Lost Child Scenarios
    {
        "text": "For lost children at Kumbh Mela: Speak calmly and reassuringly. Ask child's name, age, and parent's name/phone number. Tell them to stay exactly where they are and not move. Ask them to describe what they can see around them - colors of tents, banners, food stalls, or any landmark structures. Ask if they see any volunteers in orange/yellow vests nearby.",
        "metadata": {
            "type": "lost_child",
            "source": "Kumbh Child Safety Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },
    {
        "text": "To identify location for lost children: Ask them to look for colored zones (Red, Blue, Green, Yellow zones in Kumbh), sector numbers on poles/boards, nearest Akhara flags, or camp names. Ask if they can see the main river, any bridges, or the central announcement tower. Tell them to look for numbered checkpoints or volunteer stations.",
        "metadata": {
            "type": "lost_child",
            "source": "Location Identification Guide",
            "priority": "high",
            "location_focus": "yes"
        }
    },
    {
        "text": "Calming techniques for lost children: Use simple words, speak slowly. Say 'You are very brave for calling. Help is coming to find you.' Ask them to sit down in a safe spot. Give them simple tasks like 'count how many people you can see wearing orange clothes' to keep them occupied and provide location clues.",
        "metadata": {
            "type": "lost_child",
            "source": "Child Psychology Protocol",
            "priority": "high",
            "location_focus": "no"
        }
    },

    # Medical Emergencies in Crowd
    {
        "text": "For medical emergencies in dense crowds: Ask caller to create space around the patient if possible by asking people to step back. Ask for consciousness, breathing status, and symptoms. Instruct to look for medical volunteers (white coat with red cross) or police personnel nearby. Ask about nearest landmark for volunteer dispatch.",
        "metadata": {
            "type": "medical_crowd",
            "source": "Crowd Medical Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },
    {
        "text": "For heat stroke/dehydration at Kumbh: Ask if person is conscious, sweating, skin condition. Instruct to move patient to shade, remove tight clothing, and fan them. Ask someone to bring water/ORS if available. Ask caller to describe nearest medical post, water station, or cooling center for volunteer guidance.",
        "metadata": {
            "type": "medical_crowd",
            "source": "Heat Emergency Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },
    {
        "text": "For elderly person collapse in crowd: Ask if person is breathing and responsive. Instruct crowd to give space for air circulation. Ask caller to look for wheelchairs or stretchers nearby. Get description of nearest Seva Dal post or medical tent. Keep caller talking to patient to maintain consciousness if awake.",
        "metadata": {
            "type": "medical_crowd",
            "source": "Elderly Emergency Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },

    # Crowd Control and Stampede Prevention
    {
        "text": "For crowd crush/stampede risk: Tell caller to stay calm and not push. Instruct to move diagonally toward edges of crowd, not against flow. If fallen, curl up in fetal position protecting head. Ask them to identify nearest exit route or barriers they can see for volunteer coordination.",
        "metadata": {
            "type": "crowd_safety",
            "source": "Stampede Prevention Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },
    {
        "text": "For overcrowded bathing ghat situation: Advise caller to wait for crowd to thin before approaching water. Ask them to identify which ghat they're at by looking for name boards or distinctive features. Guide them to alternative, less crowded ghats by describing nearby landmarks.",
        "metadata": {
            "type": "crowd_safety",
            "source": "Ghat Management Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },

    # Lost Adults/Elderly
    {
        "text": "For lost elderly pilgrims: Speak slowly and clearly. Ask their name, where they came from, and their group leader's name. Ask them to sit down and stay put. Get description of nearby structures, camps, or distinctive features. Ask if they remember their accommodation camp name or area.",
        "metadata": {
            "type": "lost_adult",
            "source": "Lost Pilgrim Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },
    {
        "text": "For disoriented elderly: Ask simple questions about what they remember. Keep them talking and calm. Ask them to describe what they can see - temple flags, camp colors, or any text on banners. Tell them to ask nearby people for help while staying on call.",
        "metadata": {
            "type": "lost_adult",
            "source": "Disorientation Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },

    # Security Incidents
    {
        "text": "For theft/pickpocketing incidents: Ask if caller is safe first. Get description of incident location using nearby landmarks. Advise to report to nearest police post. Ask them to look for police personnel in uniform or security volunteers. Guide them to nearest police checkpoint.",
        "metadata": {
            "type": "security",
            "source": "Theft Response Protocol",
            "priority": "medium",
            "location_focus": "yes"
        }
    },
    {
        "text": "For harassment or misbehavior reports: Ensure caller's immediate safety. Ask them to move to crowded, well-lit area. Guide them to nearest women's help desk or police post. Ask for description of perpetrator and location. Connect them with female volunteers if available.",
        "metadata": {
            "type": "security",
            "source": "Harassment Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },

    # Weather-Related Emergencies
    {
        "text": "For sudden weather changes (rain/storm): Advise caller to seek immediate shelter in nearest pucca structure. Ask them to identify covered areas, community halls, or large tents nearby. Guide them away from temporary structures and electrical equipment. Ask about nearby permanent buildings.",
        "metadata": {
            "type": "weather",
            "source": "Weather Emergency Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },
    {
        "text": "For extreme cold at night: Ask if person has blankets or warm clothing. Direct them to nearest langars (community kitchens) serving hot food. Ask them to describe nearby light sources or warm areas. Guide them to community halls or rest areas.",
        "metadata": {
            "type": "weather",
            "source": "Cold Weather Protocol",
            "priority": "medium",
            "location_focus": "yes"
        }
    },

    # Fire/Electrical Emergencies
    {
        "text": "For fire in camping area: Tell caller to evacuate immediately and alert others. Ask them to identify the burning area and wind direction. Guide them to nearest fire assembly point. Ask about nearby water sources or fire extinguishers. Instruct to stay upwind from smoke.",
        "metadata": {
            "type": "fire_emergency",
            "source": "Fire Emergency Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },
    {
        "text": "For electrical hazards in temporary setups: Warn caller not to touch anything electrical. Ask them to keep others away from the area. Get location details using nearby non-electrical landmarks. Guide them to nearest electrical safety officer or main power control room.",
        "metadata": {
            "type": "electrical",
            "source": "Electrical Safety Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },

    # Water-Related Emergencies
    {
        "text": "For drowning or water accidents at ghats: Ask if person has been pulled out of water. Check consciousness and breathing. Instruct to clear airway and start CPR if trained. Ask for exact ghat location and nearest lifeguard post. Get description of nearby boats or rescue equipment.",
        "metadata": {
            "type": "water_emergency",
            "source": "Water Rescue Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },
    {
        "text": "For water contamination concerns: Ask about symptoms of affected people. Advise to stop using suspected water source. Guide them to nearest water testing station or medical post. Ask them to identify the water source location using nearby landmarks.",
        "metadata": {
            "type": "water_emergency",
            "source": "Water Safety Protocol",
            "priority": "medium",
            "location_focus": "yes"
        }
    },

    # Food-Related Emergencies
    {
        "text": "For food poisoning in langars: Ask about symptoms and number of affected people. Advise to stop eating from suspected source. Get location of langar using nearby camps or structures. Guide them to nearest medical post. Ask them to save food samples if possible.",
        "metadata": {
            "type": "food_emergency",
            "source": "Food Safety Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },

    # Communication and Technology Issues
    {
        "text": "For callers with weak network/breaking call: Ask them to stay in same location for callback. Get their mobile number immediately. Ask them to move to higher ground or open area for better signal. Guide them to nearest telecom tower or communication center.",
        "metadata": {
            "type": "communication",
            "source": "Network Issue Protocol",
            "priority": "medium",
            "location_focus": "yes"
        }
    },
    {
        "text": "For non-Hindi/Marathi speaking pilgrims: Use simple English or ask if anyone nearby speaks their language. Use basic words for location identification. Ask them to hand phone to someone who speaks Hindi/Marathi if available. Use visual cues for communication.",
        "metadata": {
            "type": "communication",
            "source": "Language Barrier Protocol",
            "priority": "medium",
            "location_focus": "yes"
        }
    },

    # Vehicle and Transportation Issues
    {
        "text": "For vehicle breakdown on access roads: Ask if vehicle is creating traffic obstruction. Get nearest kilometer marker or landmark. Ask them to use hazard lights and place warning triangle. Guide them to nearest towing service point or traffic police post.",
        "metadata": {
            "type": "transport",
            "source": "Vehicle Emergency Protocol",
            "priority": "medium",
            "location_focus": "yes"
        }
    },
    {
        "text": "For bus/transportation disputes: Ensure caller's safety first. Ask for bus number and route. Guide them to nearest transport authority office. Ask about nearby bus stops or transportation hubs for location identification.",
        "metadata": {
            "type": "transport",
            "source": "Transport Dispute Protocol",
            "priority": "medium",
            "location_focus": "yes"
        }
    },

    # Special Needs and Accessibility
    {
        "text": "For disabled pilgrims needing assistance: Ask about specific needs - wheelchair access, medical requirements, or mobility assistance. Get their current location using nearby accessible landmarks. Guide them to nearest volunteer station equipped for disabled assistance.",
        "metadata": {
            "type": "accessibility",
            "source": "Disability Assistance Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },

    # Nashik-Specific Location Identifiers
    {
        "text": "Key Nashik Kumbh landmarks for location identification: Ramkund, Triveni Sangam, Kalaram Temple area, CIDCO area, Gangapur Road sector, Mela Committee Office, Main Gate entries (Gate 1-10), Central Announcement Tower, Helicopter landing area, VIP camping area, Media center.",
        "metadata": {
            "type": "location_guide",
            "source": "Nashik Landmark Guide",
            "priority": "high",
            "location_focus": "yes"
        }
    },
    {
        "text": "Nashik Kumbh zone identification: Ask callers to look for colored banners/flags indicating zones - Sector A (Red), Sector B (Blue), Sector C (Green), Sector D (Yellow). Each sector has numbered sub-divisions. Ask for nearest numbered pole or signboard.",
        "metadata": {
            "type": "location_guide",
            "source": "Zone Identification System",
            "priority": "high",
            "location_focus": "yes"
        }
    },
    {
        "text": "Major Akharas in Nashik for location reference: Shri Niranjani Akhara, Juna Akhara, Mahanirvani Akhara, Atal Akhara, Anand Akhara. Ask callers if they can see distinctive flags, banners, or camps of these Akharas to determine location.",
        "metadata": {
            "type": "location_guide",
            "source": "Akhara Location Guide",
            "priority": "medium",
            "location_focus": "yes"
        }
    },

    # Volunteer Coordination
    {
        "text": "Identifying nearby volunteers: Ask caller to look for people wearing orange/yellow vests with 'VOLUNTEER' written. Check for Seva Dal members in white kurta with colored badges. Look for Red Cross volunteers in white coats. Ask if they can see any help desk or information booth nearby.",
        "metadata": {
            "type": "volunteer_identification",
            "source": "Volunteer Recognition Guide",
            "priority": "high",
            "location_focus": "no"
        }
    },
    {
        "text": "When no volunteer is visible: Instruct caller to ask nearby shopkeepers or langar operators for help. Ask them to approach groups of organized pilgrims who might have group leaders. Guide them to nearest main pathway where volunteers patrol regularly.",
        "metadata": {
            "type": "volunteer_identification",
            "source": "Alternative Help Sources",
            "priority": "medium",
            "location_focus": "yes"
        }
    },

    # Mental Health and Panic Management
    {
        "text": "For panic attacks in crowd: Tell caller to breathe slowly - in for 4 counts, out for 4 counts. Ask them to sit down if possible. Help them identify 5 things they can see, 4 things they can hear, 3 things they can touch. Keep them talking until volunteer arrives.",
        "metadata": {
            "type": "mental_health",
            "source": "Panic Management Protocol",
            "priority": "high",
            "location_focus": "no"
        }
    },
    {
        "text": "For overwhelming situations: Acknowledge their feelings - 'I understand this is scary with so many people around.' Remind them they are safe and help is coming. Give them simple, achievable tasks like 'tell me what color tent is nearest to you' to regain control.",
        "metadata": {
            "type": "mental_health",
            "source": "Crowd Anxiety Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },

    # Time-Sensitive Scenarios
    {
        "text": "During peak bathing hours (Shahi Snan): Expect higher emergency call volume. Ask callers to be extra patient. Guide them to less crowded alternate routes. Remind them that bathing can be done at any time, safety is priority. Ask about nearby less crowded ghats.",
        "metadata": {
            "type": "peak_time",
            "source": "Peak Hour Management",
            "priority": "high",
            "location_focus": "yes"
        }
    },
    {
        "text": "During night hours: Ask callers to stay in well-lit areas. Guide them to 24-hour service areas like medical posts, police stations, or main langars. Ask them to identify nearest light sources for location determination.",
        "metadata": {
            "type": "night_emergency",
            "source": "Night Safety Protocol",
            "priority": "high",
            "location_focus": "yes"
        }
    },

    # General Caller Management
    {
        "text": "Managing multiple emergency aspects: Prioritize immediate life threats first, then location identification, then comfort measures. Keep caller focused on one task at a time. Use their name if provided to maintain connection. Confirm each instruction before moving to next.",
        "metadata": {
            "type": "call_management",
            "source": "Emergency Call Protocol",
            "priority": "high",
            "location_focus": "no"
        }
    },
    {
        "text": "For repeat callers or false alarms: Stay professional and assess each call independently. Ask specific questions to verify emergency. Document call details for pattern recognition. Still provide appropriate assistance and location guidance.",
        "metadata": {
            "type": "call_management",
            "source": "Call Verification Protocol",
            "priority": "medium",
            "location_focus": "no"
        }
    },

    # Closing and Follow-up
    {
        "text": "Before ending emergency calls: Confirm volunteer is dispatched, give estimated arrival time if known, provide callback number, remind caller to stay in same location, and ask them to call back if situation changes before help arrives.",
        "metadata": {
            "type": "call_closure",
            "source": "Call Completion Protocol",
            "priority": "high",
            "location_focus": "no"
        }
    },
    {
        "text": "Post-emergency follow-up: Schedule callback within 30 minutes to check status. Document resolution and volunteer response time. Note any location identification challenges for system improvement. Update volunteer about caller feedback.",
        "metadata": {
            "type": "call_closure",
            "source": "Follow-up Protocol",
            "priority": "medium",
            "location_focus": "no"
        }
    }
]

# Add documents to collection
collection.add(
    documents=[item["text"] for item in kumbh_mela_knowledge],
    metadatas=[item["metadata"] for item in kumbh_mela_knowledge],
    ids=[f"kumbh_doc_{i}" for i in range(len(kumbh_mela_knowledge))]
)

print(f"Added {len(kumbh_mela_knowledge)} documents to the Kumbh Mela emergency knowledge base")

# Test queries to verify the collection is working
test_queries = [
    "A child is lost at Kumbh Mela",
    "Someone collapsed in the crowd",
    "How to identify location in Kumbh Mela",
    "Fire emergency in camping area",
    "Drowning at bathing ghat"
]

for query in test_queries:
    print(f"\n{'='*50}")
    print(f"Test Query: {query}")
    print('='*50)
    
    results = collection.query(
        query_texts=[query],
        n_results=2
    )
    
    for i, (doc, metadata) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
        print(f"\nResult {i+1}:")
        print(f"Type: {metadata.get('type', 'N/A')}")
        print(f"Priority: {metadata.get('priority', 'N/A')}")
        print(f"Location Focus: {metadata.get('location_focus', 'N/A')}")
        print(f"Text: {doc}")
        print("-" * 40)

print(f"\n{'='*60}")
print("KUMBH MELA EMERGENCY KNOWLEDGE BASE SETUP COMPLETE!")
print(f"{'='*60}")
print(f"Total documents: {len(kumbh_mela_knowledge)}")
print("Categories covered:")
categories = set(item["metadata"]["type"] for item in kumbh_mela_knowledge)
for category in sorted(categories):
    count = sum(1 for item in kumbh_mela_knowledge if item["metadata"]["type"] == category)
    print(f"  - {category}: {count} documents")