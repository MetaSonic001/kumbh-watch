import React, { useState, useEffect, useRef } from 'react';

// Your Mapbox access token
export const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoic2hhcmlhbiIsImEiOiJjbDg0aGQxNG8wZnhnM25sa3VlYzk1NzVtIn0.BxFbcyCbxdoSXAmSgcS5og';

// Define base URLs - change here for different environments
const FLASK_BASE_URL = 'http://localhost:5000';
const FASTAPI_BASE_URL = 'http://localhost:8000';

// Predefined locations (gates and university points) with coordinates
const PREDEFINED_LOCATIONS = {
  'gate 1': { lat: 20.0087, lng: 73.7922, type: 'gate', color: '#ef4444', label: 'Gate 1' },
  'gate 2': { lat: 20.0090, lng: 73.7930, type: 'gate', color: '#ef4444', label: 'Gate 2' },
  'gate 3': { lat: 20.0075, lng: 73.7915, type: 'gate', color: '#ef4444', label: 'Gate 3' },
  'main building': { lat: 20.008727, lng: 73.792189, type: 'university', color: '#3b82f6', label: 'Main Building' },
  'hostel': { lat: 20.0085, lng: 73.7925, type: 'university', color: '#3b82f6', label: 'Hostel' },
  'medical post': { lat: 20.0092, lng: 73.7918, type: 'university', color: '#10b981', label: 'Medical Post' },
  'police post': { lat: 20.0078, lng: 73.7928, type: 'university', color: '#f97316', label: 'Police Post' },
};

const AdminPortal = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const emergencyMarkerRef = useRef(null);

  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [instructions, setInstructions] = useState([]);
  const [instructionText, setInstructionText] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [duration, setDuration] = useState(300);
  const [alertsWs, setAlertsWs] = useState(null);
  const [instructionsWs, setInstructionsWs] = useState(null);

  // Initialize Mapbox map
  useEffect(() => {
    // Load Mapbox GL CSS and JS
    const loadMapbox = async () => {
      // Check if Mapbox is already loaded
      if (window.mapboxgl) {
        initializeMap();
        return;
      }

      // Load CSS
      const cssLink = document.createElement('link');
      cssLink.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      cssLink.rel = 'stylesheet';
      document.head.appendChild(cssLink);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.onload = () => {
        initializeMap();
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (map.current) return; // Map already initialized

      window.mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
      
      map.current = new window.mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [73.792189, 20.008727],
        zoom: 15
      });

      map.current.on('load', () => {
        addPredefinedMarkers();
      });

      // Add navigation controls
      map.current.addControl(new window.mapboxgl.NavigationControl());
    };

    loadMapbox();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add predefined location markers
  const addPredefinedMarkers = () => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    Object.entries(PREDEFINED_LOCATIONS).forEach(([key, location]) => {
      // Create marker element
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.backgroundColor = location.color;
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      // Create popup
      const popup = new window.mapboxgl.Popup({ 
        offset: 25,
        closeButton: false,
        closeOnClick: false 
      }).setHTML(`<div style="font-size: 12px; font-weight: bold;">${location.label}</div>`);

      // Create marker
      const marker = new window.mapboxgl.Marker(el)
        .setLngLat([location.lng, location.lat])
        .setPopup(popup)
        .addTo(map.current);

      markersRef.current.push(marker);
    });
  };

  // Add/update emergency marker
  const updateEmergencyMarker = (emergency) => {
    if (emergencyMarkerRef.current) {
      emergencyMarkerRef.current.remove();
    }

    if (!emergency?.location) return;

    const locationKey = emergency.location.toLowerCase();
    const location = PREDEFINED_LOCATIONS[locationKey];
    
    if (!location) return;

    // Create emergency marker element
    const el = document.createElement('div');
    el.className = 'emergency-marker';
    el.style.backgroundColor = '#000000';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.border = '3px solid #ffffff';
    el.style.boxShadow = '0 0 10px rgba(255,0,0,0.8)';
    el.style.animation = 'pulse 2s infinite';

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { box-shadow: 0 0 10px rgba(255,0,0,0.8); }
        50% { box-shadow: 0 0 20px rgba(255,0,0,1); }
        100% { box-shadow: 0 0 10px rgba(255,0,0,0.8); }
      }
    `;
    document.head.appendChild(style);

    // Create popup
    const popup = new window.mapboxgl.Popup({ offset: 25 })
      .setHTML(`
        <div style="font-size: 12px;">
          <strong>Emergency: ${emergency.emergency_type}</strong><br>
          <strong>Situation:</strong> ${emergency.situation}<br>
          <strong>Priority:</strong> ${emergency.priority}
        </div>
      `);

    // Create marker
    emergencyMarkerRef.current = new window.mapboxgl.Marker(el)
      .setLngLat([location.lng, location.lat])
      .setPopup(popup)
      .addTo(map.current);

    // Fly to the emergency location
    map.current.flyTo({
      center: [location.lng, location.lat],
      zoom: 16,
      essential: true
    });
  };

  // Fetch emergencies from Flask /admin-json every 5 seconds
  useEffect(() => {
    const fetchEmergencies = async () => {
      try {
        const res = await fetch(`${FLASK_BASE_URL}/admin-json`);
        const data = await res.json();
        setEmergencies(data);
      } catch (error) {
        console.error('Error fetching emergencies:', error);
      }
    };

    fetchEmergencies();
    const interval = setInterval(fetchEmergencies, 5000);
    return () => clearInterval(interval);
  }, []);

  // Connect to FastAPI WebSockets
  useEffect(() => {
    // Alerts WebSocket
    const alertsSocket = new WebSocket(`${FASTAPI_BASE_URL.replace('http', 'ws')}/ws/alerts`);
    alertsSocket.onopen = () => console.log('Alerts WS connected');
    alertsSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setAlerts((prev) => [...prev, data].slice(-50)); // Keep last 50 alerts
    };
    alertsSocket.onclose = () => console.log('Alerts WS closed');
    setAlertsWs(alertsSocket);

    // Instructions WebSocket
    const instructionsSocket = new WebSocket(`${FASTAPI_BASE_URL.replace('http', 'ws')}/ws/instructions`);
    instructionsSocket.onopen = () => console.log('Instructions WS connected');
    instructionsSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setInstructions((prev) => [...prev, data].slice(-50)); // Keep last 50 instructions
    };
    instructionsSocket.onclose = () => console.log('Instructions WS closed');
    setInstructionsWs(instructionsSocket);

    return () => {
      alertsSocket.close();
      instructionsSocket.close();
    };
  }, []);

  // Handle sending emergency instructions to FastAPI
  const sendInstructions = async (customText, customPriority = 'HIGH', customDuration = 300) => {
    try {
      const params = new URLSearchParams({
        instructions: customText || instructionText,
        priority: customPriority || priority,
        duration: customDuration || duration,
      });
      
      const res = await fetch(`${FASTAPI_BASE_URL}/instructions?${params}`, {
        method: 'POST',
      });
      
      if (res.ok) {
        setInstructionText('');
        alert('Instructions sent successfully');
      } else {
        throw new Error('Failed to send instructions');
      }
    } catch (error) {
      console.error('Error sending instructions:', error);
      alert('Failed to send instructions');
    }
  };

  // Handle dispatch buttons (prefill and send instructions)
  const dispatchMedical = (location, situation) => {
    const text = `Dispatch medical team to ${location}: ${situation}`;
    sendInstructions(text, 'HIGH', 600); // 10 minutes
  };

  const dispatchPolice = (location, situation) => {
    const text = `Dispatch police to ${location}: ${situation}`;
    sendInstructions(text, 'HIGH', 600);
  };

  const dispatchVolunteer = (location, situation) => {
    const text = `Dispatch volunteers to ${location}: ${situation}`;
    sendInstructions(text, 'MEDIUM', 300);
  };

  // Handle selecting an emergency
  const selectEmergency = (em) => {
    setSelectedEmergency(em);
    updateEmergencyMarker(em);
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar: List of active emergency calls */}
      <div className="w-1/4 bg-white p-4 overflow-y-auto border-r border-gray-200">
        <h2 className="text-xl font-bold mb-4">Active Emergency Calls</h2>
        {emergencies.length === 0 ? (
          <p className="text-gray-500">No active emergencies</p>
        ) : (
          emergencies.map((em) => (
            <div
              key={em.call_sid}
              className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                selectedEmergency?.call_sid === em.call_sid ? 'bg-blue-100 border-blue-300 border' : 'bg-gray-50'
              } hover:bg-blue-50`}
              onClick={() => selectEmergency(em)}
            >
              <h3 className="font-semibold">{em.emergency_type} - {em.priority}</h3>
              <p className="text-sm text-gray-600">Caller: {em.caller}</p>
              <p className="text-sm text-gray-600">Location: {em.location || 'Unknown'}</p>
              <p className="text-sm text-gray-600">Language: {em.language}</p>
            </div>
          ))
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar: Dispatch and Instructions */}
        <div className="bg-white p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold mb-4">Emergency Management</h2>
          <div className="flex space-x-4 mb-4">
            <input
              type="text"
              value={instructionText}
              onChange={(e) => setInstructionText(e.target.value)}
              placeholder="Enter emergency instructions..."
              className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Duration (s)"
              className="w-24 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => sendInstructions()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Send Instructions
            </button>
          </div>
          {selectedEmergency && (
            <div className="flex space-x-4">
              <button
                onClick={() => dispatchMedical(selectedEmergency.location, selectedEmergency.situation)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                Dispatch Medical
              </button>
              <button
                onClick={() => dispatchPolice(selectedEmergency.location, selectedEmergency.situation)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Dispatch Police
              </button>
              <button
                onClick={() => dispatchVolunteer(selectedEmergency.location, selectedEmergency.situation)}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
              >
                Dispatch Volunteer
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${FLASK_BASE_URL}/send_to_volunteer`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                      },
                      body: new URLSearchParams({
                        call_sid: selectedEmergency.call_sid,
                        location: selectedEmergency.location,
                        emergency_type: selectedEmergency.emergency_type,
                        situation: selectedEmergency.situation,
                      })
                    });
                    if (res.ok) {
                      alert('Sent to volunteer successfully');
                    } else {
                      alert('Failed to send to volunteer');
                    }
                  } catch (error) {
                    console.error('Error sending to volunteer:', error);
                    alert('Failed to send to volunteer');
                  }
                }}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
              >
                Send to Volunteer (Flask)
              </button>
            </div>
          )}
        </div>

        {/* Main Area: Map and Selected Emergency Details */}
        <div className="flex flex-1">
          {/* Mapbox Map */}
          <div className="w-1/2 relative">
            <div ref={mapContainer} className="w-full h-full" />
          </div>

          {/* Selected Emergency Details */}
          <div className="w-1/2 p-4 overflow-y-auto bg-white">
            {selectedEmergency ? (
              <div>
                <h2 className="text-xl font-bold mb-4">Selected Emergency Details</h2>
                <div className="space-y-2">
                  <p><strong>Call SID:</strong> {selectedEmergency.call_sid}</p>
                  <p><strong>Caller:</strong> {selectedEmergency.caller}</p>
                  <p><strong>Type:</strong> {selectedEmergency.emergency_type}</p>
                  <p><strong>Location:</strong> {selectedEmergency.location}</p>
                  <p><strong>Situation:</strong> {selectedEmergency.situation}</p>
                  <p><strong>Priority:</strong> <span className={`px-2 py-1 rounded text-sm font-semibold ${
                    selectedEmergency.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                    selectedEmergency.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>{selectedEmergency.priority}</span></p>
                  <p><strong>Language:</strong> {selectedEmergency.language}</p>
                  <p><strong>Landmarks:</strong> {selectedEmergency.landmarks_mentioned?.join(', ') || 'None'}</p>
                </div>
                <h3 className="font-semibold mt-6 mb-3">Conversation History:</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedEmergency.conversation_history?.map((msg, idx) => (
                    <div key={idx} className={`p-2 rounded ${
                      msg.role === 'user' ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'
                    }`}>
                      <strong className={msg.role === 'user' ? 'text-blue-700' : 'text-gray-700'}>
                        {msg.role === 'user' ? 'Caller' : 'Assistant'}:
                      </strong> {msg.content}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-lg">Select an emergency from the sidebar</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Alerts and Instructions Log */}
        <div className="bg-white p-4 border-t border-gray-200 h-1/3 flex">
          {/* Alerts Log */}
          <div className="w-1/2 pr-2 overflow-y-auto">
            <h2 className="text-xl font-bold mb-2">Real-Time Alerts</h2>
            {alerts.length === 0 ? (
              <p className="text-gray-500">No alerts yet</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded border-l-4 border-orange-400">
                    <p><strong>Type:</strong> {alert.type}</p>
                    <p><strong>Message:</strong> {alert.message}</p>
                    <p><strong>Timestamp:</strong> {alert.timestamp}</p>
                    {alert.people_count && <p><strong>People Count:</strong> {alert.people_count}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions Log */}
          <div className="w-1/2 pl-2 overflow-y-auto border-l border-gray-200">
            <h2 className="text-xl font-bold mb-2">Sent Instructions</h2>
            {instructions.length === 0 ? (
              <p className="text-gray-500">No instructions sent yet</p>
            ) : (
              <div className="space-y-2">
                {instructions.map((inst, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded border-l-4 border-blue-400">
                    <p><strong>Priority:</strong> <span className={`px-2 py-1 rounded text-sm font-semibold ${
                      inst.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                      inst.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>{inst.priority}</span></p>
                    <p><strong>Instructions:</strong> {inst.instructions}</p>
                    <p><strong>Duration:</strong> {inst.duration} seconds</p>
                    <p><strong>Timestamp:</strong> {inst.timestamp}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPortal;