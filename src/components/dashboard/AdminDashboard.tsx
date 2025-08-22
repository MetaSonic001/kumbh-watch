// AdminPortal.jsx - React + Vite component for the admin portal
// To use: npm install react-map-gl axios tailwindcss postcss autoprefixer
// Setup Tailwind in vite.config.js and tailwind.config.js as per docs
// Import in your App.jsx: <AdminPortal />

import React, { useState, useEffect } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios';

// Define base URLs - change here for different environments
const FLASK_BASE_URL = 'http://localhost:5000';
const FASTAPI_BASE_URL = 'http://localhost:8000';
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoic2hhcmlhbiIsImEiOiJjbDg0aGQxNG8wZnhnM25sa3VlYzk1NzVtIn0.BxFbcyCbxdoSXAmSgcS5og';

// Predefined locations (gates and university points) with coordinates
const PREDEFINED_LOCATIONS = {
  'gate 1': { lat: 20.0087, lng: 73.7922, type: 'gate', color: 'red', label: 'Gate 1' },
  'gate 2': { lat: 20.0090, lng: 73.7930, type: 'gate', color: 'red', label: 'Gate 2' },
  'gate 3': { lat: 20.0075, lng: 73.7915, type: 'gate', color: 'red', label: 'Gate 3' },
  'main building': { lat: 20.008727, lng: 73.792189, type: 'university', color: 'blue', label: 'Main Building' },
  'hostel': { lat: 20.0085, lng: 73.7925, type: 'university', color: 'blue', label: 'Hostel' },
  'medical post': { lat: 20.0092, lng: 73.7918, type: 'university', color: 'green', label: 'Medical Post' },
  'police post': { lat: 20.0078, lng: 73.7928, type: 'university', color: 'orange', label: 'Police Post' },
  // Add more points as needed based on actual maps
};

const AdminPortal = () => {
  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [instructions, setInstructions] = useState([]);
  const [instructionText, setInstructionText] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [duration, setDuration] = useState(300);
  const [alertsWs, setAlertsWs] = useState(null);
  const [instructionsWs, setInstructionsWs] = useState(null);
  const [viewport, setViewport] = useState({
    latitude: 20.008727,
    longitude: 73.792189,
    zoom: 15,
  });

  // Fetch emergencies from Flask /admin-json every 5 seconds
  useEffect(() => {
    const fetchEmergencies = async () => {
      try {
        const res = await axios.get(`${FLASK_BASE_URL}/admin-json`);
        setEmergencies(res.data);
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
      await axios.post(`${FASTAPI_BASE_URL}/instructions`, null, {
        params: {
          instructions: customText || instructionText,
          priority: customPriority || priority,
          duration: customDuration || duration,
        },
      });
      setInstructionText('');
      alert('Instructions sent successfully');
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
    if (em.location && PREDEFINED_LOCATIONS[em.location.toLowerCase()]) {
      const loc = PREDEFINED_LOCATIONS[em.location.toLowerCase()];
      setViewport({
        latitude: loc.lat,
        longitude: loc.lng,
        zoom: 16,
      });
    }
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
              className={`p-3 mb-2 rounded-lg cursor-pointer ${
                selectedEmergency?.call_sid === em.call_sid ? 'bg-blue-100' : 'bg-gray-50'
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
              className="flex-1 p-2 border border-gray-300 rounded"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="p-2 border border-gray-300 rounded"
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
              className="w-24 p-2 border border-gray-300 rounded"
            />
            <button
              onClick={() => sendInstructions()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Send Instructions
            </button>
          </div>
          {selectedEmergency && (
            <div className="flex space-x-4">
              <button
                onClick={() => dispatchMedical(selectedEmergency.location, selectedEmergency.situation)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Dispatch Medical
              </button>
              <button
                onClick={() => dispatchPolice(selectedEmergency.location, selectedEmergency.situation)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Dispatch Police
              </button>
              <button
                onClick={() => dispatchVolunteer(selectedEmergency.location, selectedEmergency.situation)}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Dispatch Volunteer
              </button>
              <button
                onClick={() => axios.post(`${FLASK_BASE_URL}/send_to_volunteer`, {
                  call_sid: selectedEmergency.call_sid,
                  location: selectedEmergency.location,
                  emergency_type: selectedEmergency.emergency_type,
                  situation: selectedEmergency.situation,
                }, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Send to Volunteer (Flask)
              </button>
            </div>
          )}
        </div>

        {/* Main Area: Map and Selected Emergency Details */}
        <div className="flex flex-1">
          {/* Mapbox Map */}
          <div className="w-1/2">
            <Map
              initialViewState={viewport}
              onMove={(evt) => setViewport(evt.viewState)}
              style={{ width: '100%', height: '100%' }}
              mapStyle="mapbox://styles/mapbox/streets-v11"
              mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
            >
              {/* Mark all predefined locations */}
              {Object.entries(PREDEFINED_LOCATIONS).map(([key, loc]) => (
                <Marker key={key} latitude={loc.lat} longitude={loc.lng} color={loc.color}>
                  <Popup latitude={loc.lat} longitude={loc.lng} closeButton={false} closeOnClick={false}>
                    {loc.label}
                  </Popup>
                </Marker>
              ))}

              {/* Highlight selected emergency location if matched */}
              {selectedEmergency?.location && PREDEFINED_LOCATIONS[selectedEmergency.location.toLowerCase()] && (
                <Marker
                  latitude={PREDEFINED_LOCATIONS[selectedEmergency.location.toLowerCase()].lat}
                  longitude={PREDEFINED_LOCATIONS[selectedEmergency.location.toLowerCase()].lng}
                  color="black"
                >
                  <Popup
                    latitude={PREDEFINED_LOCATIONS[selectedEmergency.location.toLowerCase()].lat}
                    longitude={PREDEFINED_LOCATIONS[selectedEmergency.location.toLowerCase()].lng}
                  >
                    Emergency: {selectedEmergency.emergency_type}<br />
                    Situation: {selectedEmergency.situation}
                  </Popup>
                </Marker>
              )}
            </Map>
          </div>

          {/* Selected Emergency Details */}
          <div className="w-1/2 p-4 overflow-y-auto bg-white">
            {selectedEmergency ? (
              <div>
                <h2 className="text-xl font-bold mb-4">Selected Emergency Details</h2>
                <p><strong>Call SID:</strong> {selectedEmergency.call_sid}</p>
                <p><strong>Caller:</strong> {selectedEmergency.caller}</p>
                <p><strong>Type:</strong> {selectedEmergency.emergency_type}</p>
                <p><strong>Location:</strong> {selectedEmergency.location}</p>
                <p><strong>Situation:</strong> {selectedEmergency.situation}</p>
                <p><strong>Priority:</strong> {selectedEmergency.priority}</p>
                <p><strong>Language:</strong> {selectedEmergency.language}</p>
                <p><strong>Landmarks:</strong> {selectedEmergency.landmarks_mentioned?.join(', ') || 'None'}</p>
                <h3 className="font-semibold mt-4">Conversation History:</h3>
                <ul className="list-disc pl-5">
                  {selectedEmergency.conversation_history?.map((msg, idx) => (
                    <li key={idx}>
                      <strong>{msg.role}:</strong> {msg.content}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-500">Select an emergency from the sidebar</p>
            )}
          </div>
        </div>

        {/* Bottom Section: Alerts and Instructions Log */}
        <div className="bg-white p-4 border-t border-gray-200 h-1/3 flex">
          {/* Alerts Log */}
          <div className="w-1/2 pr-2 overflow-y-auto">
            <h2 className="text-xl font-bold mb-2">Real-Time Alerts</h2>
            {alerts.map((alert, idx) => (
              <div key={idx} className="p-2 mb-2 bg-gray-50 rounded">
                <p><strong>Type:</strong> {alert.type}</p>
                <p><strong>Message:</strong> {alert.message}</p>
                <p><strong>Timestamp:</strong> {alert.timestamp}</p>
                {alert.people_count && <p><strong>People Count:</strong> {alert.people_count}</p>}
              </div>
            ))}
          </div>

          {/* Instructions Log */}
          <div className="w-1/2 pl-2 overflow-y-auto">
            <h2 className="text-xl font-bold mb-2">Sent Instructions</h2>
            {instructions.map((inst, idx) => (
              <div key={idx} className="p-2 mb-2 bg-gray-50 rounded">
                <p><strong>Priority:</strong> {inst.priority}</p>
                <p><strong>Instructions:</strong> {inst.instructions}</p>
                <p><strong>Duration:</strong> {inst.duration} seconds</p>
                <p><strong>Timestamp:</strong> {inst.timestamp}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPortal;