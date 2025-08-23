import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MapPin, Phone, Clock, AlertTriangle, Users, CheckCircle, XCircle, Activity, Wifi, WifiOff } from 'lucide-react';

// Types
interface EmergencyData {
  id: string;
  timestamp: string;
  type?: string;
  location?: string;
  description?: string;
  priority?: string;
  status?: string;
  contact?: string;
  volunteer_assigned?: string;
  aiAnalysis?: {
    location: string;
    name: string;
    age: string;
    summary: string;
    type: string;
    title: string;
    emergencyType: string;
    landmarks?: string[];
    personDescription?: string;
  };
  originalConversation?: Array<{
    role: string;
    content: string;
  }>;
}

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}

interface DashboardSummary {
  total_active: number;
  recent_hour: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  by_status: Record<string, number>;
  connected_clients: Record<string, number>;
  timestamp: string;
}

const EmergencyDashboard = () => {
  const [emergencies, setEmergencies] = useState<EmergencyData[]>([]);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'emergencies' | 'map'>('overview');
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  // FastAPI and WebSocket server URLs
  const FASTAPI_URL = 'http://localhost:5000';
  const WEBSOCKET_URL = 'ws://localhost:3001';

  const connectWebSocket = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      ws.current = new WebSocket(`${WEBSOCKET_URL}?type=dashboard`);

      ws.current.onopen = () => {
        console.log('WebSocket Connected');
        setIsConnected(true);
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = undefined;
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message:', message);
          
          switch (message.type) {
            case 'emergency-alert':
            case 'twilio-emergency':
              setEmergencies(prev => {
                const existingIndex = prev.findIndex(e => e.id === message.data.id);
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = { ...updated[existingIndex], ...message.data };
                  return updated;
                } else {
                  return [message.data, ...prev];
                }
              });
              break;
              
            case 'emergency-status-update':
              setEmergencies(prev => 
                prev.map(e => e.id === message.data.id ? message.data : e)
              );
              break;
              
            case 'emergency-resolved':
              setEmergencies(prev => 
                prev.map(e => e.id === message.data.id ? { ...e, status: 'resolved' } : e)
              );
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket Disconnected');
        setIsConnected(false);
        reconnectTimeout.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connectWebSocket();
        }, 2000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
        ws.current?.close();
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
      reconnectTimeout.current = setTimeout(connectWebSocket, 2000);
    }
  }, []);

  // Initialize connections
  useEffect(() => {
    connectWebSocket();
    loadInitialData();

    return () => {
      if (ws.current) ws.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connectWebSocket]);

  // Load initial data from APIs
  const loadInitialData = async () => {
    try {
      // Load from WebSocket server
      const wsResponse = await fetch(`http://localhost:3001/api/emergencies`);
      if (wsResponse.ok) {
        const wsEmergencies = await wsResponse.json();
        setEmergencies(prev => [...wsEmergencies, ...prev]);
      }

      // Load from FastAPI
      const fastApiResponse = await fetch(`${FASTAPI_URL}/emergencies`);
      if (fastApiResponse.ok) {
        const fastApiEmergencies = await fastApiResponse.json();
        setEmergencies(prev => {
          const combined = [...prev];
          fastApiEmergencies.forEach((emergency: EmergencyData) => {
            if (!combined.find(e => e.id === emergency.id)) {
              combined.push(emergency);
            }
          });
          return combined;
        });
      }

      // Load dashboard summary
      loadSummary();
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/dashboard/summary`);
      if (response.ok) {
        const summaryData = await response.json();
        setSummary(summaryData);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  // Emergency actions
  const updateEmergencyStatus = async (emergencyId: string, status: string, volunteerId?: string) => {
    try {
      const payload = { status, ...(volunteerId && { volunteer_id: volunteerId }) };
      
      // Update via WebSocket server
      await fetch(`http://localhost:3001/api/emergencies/${emergencyId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Update via FastAPI
      await fetch(`${FASTAPI_URL}/emergencies/${emergencyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

    } catch (error) {
      console.error('Error updating emergency status:', error);
    }
  };

  const resolveEmergency = async (emergencyId: string) => {
    try {
      // Resolve via WebSocket server
      await fetch(`http://localhost:3001/api/emergencies/${emergencyId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved_by: 'dashboard_user' })
      });

      // Resolve via FastAPI
      await fetch(`${FASTAPI_URL}/emergencies/${emergencyId}/resolve`, {
        method: 'POST'
      });

    } catch (error) {
      console.error('Error resolving emergency:', error);
    }
  };

  const assignVolunteer = async (emergencyId: string, volunteerId: string) => {
    try {
      await fetch(`http://localhost:3001/api/volunteers/${volunteerId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergency_id: emergencyId })
      });

      await updateEmergencyStatus(emergencyId, 'volunteer_assigned', volunteerId);
    } catch (error) {
      console.error('Error assigning volunteer:', error);
    }
  };

  const createTestEmergency = async () => {
    try {
      await fetch(`${FASTAPI_URL}/test_emergency`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error creating test emergency:', error);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'critical': return 'text-red-600 bg-red-50';
      case 'medium':
      case 'moderate': return 'text-orange-600 bg-orange-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'text-red-600 bg-red-50';
      case 'dispatching': return 'text-blue-600 bg-blue-50';
      case 'volunteer_assigned': return 'text-purple-600 bg-purple-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getEmergencyTypeIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'lost_child': return '👶';
      case 'lost_adult': return '🔍';
      case 'medical': return '🏥';
      case 'fire': return '🔥';
      case 'crowd': return '👥';
      case 'security': return '🚔';
      case 'water': return '💧';
      default: return '🚨';
    }
  };

  const activeEmergencies = emergencies.filter(e => e.status !== 'resolved');
  const resolvedEmergencies = emergencies.filter(e => e.status === 'resolved');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={createTestEmergency}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Test Emergency
              </button>
              <button
                onClick={loadSummary}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {['overview', 'emergencies', 'map'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Active Emergencies</p>
                    <p className="text-2xl font-semibold text-gray-900">{summary?.total_active || activeEmergencies.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Recent Hour</p>
                    <p className="text-2xl font-semibold text-gray-900">{summary?.recent_hour || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Connected Clients</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {summary?.connected_clients ? Object.values(summary.connected_clients).reduce((a, b) => a + b, 0) : 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-purple-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Resolved Today</p>
                    <p className="text-2xl font-semibold text-gray-900">{resolvedEmergencies.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Types Breakdown */}
            {summary?.by_type && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Types</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(summary.by_type).map(([type, count]) => (
                    <div key={type} className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-2xl mb-2">{getEmergencyTypeIcon(type)}</div>
                      <p className="text-sm font-medium text-gray-900">{count}</p>
                      <p className="text-xs text-gray-500 capitalize">{type.replace('_', ' ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Emergencies Tab */}
        {activeTab === 'emergencies' && (
          <div className="space-y-6">
            {/* Active Emergencies */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Active Emergencies ({activeEmergencies.length})</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {activeEmergencies.map((emergency) => (
                  <div
                    key={emergency.id}
                    className="p-6 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedEmergency(emergency)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getEmergencyTypeIcon(emergency.aiAnalysis?.emergencyType || emergency.type)}</span>
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">
                              {emergency.aiAnalysis?.title || emergency.description || 'Emergency Report'}
                            </h4>
                            <p className="text-sm text-gray-600">ID: {emergency.id}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {emergency.aiAnalysis?.location || emergency.location || 'Location unclear'}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {new Date(emergency.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          
                          {emergency.contact && (
                            <div className="flex items-center space-x-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{emergency.contact}</span>
                            </div>
                          )}
                        </div>
                        
                        {emergency.aiAnalysis?.summary && (
                          <p className="mt-2 text-sm text-gray-700">{emergency.aiAnalysis.summary}</p>
                        )}
                      </div>
                      
                      <div className="flex flex-col space-y-2 ml-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(emergency.aiAnalysis?.type || emergency.priority)}`}>
                          {emergency.aiAnalysis?.type || emergency.priority || 'medium'}
                        </span>
                        
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(emergency.status)}`}>
                          {emergency.status || 'active'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateEmergencyStatus(emergency.id, 'dispatching');
                        }}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Dispatch
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const volunteerId = prompt('Enter volunteer ID:');
                          if (volunteerId) assignVolunteer(emergency.id, volunteerId);
                        }}
                        className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                      >
                        Assign Volunteer
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveEmergency(emergency.id);
                        }}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                ))}
                
                {activeEmergencies.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No active emergencies</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Resolved */}
            {resolvedEmergencies.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Recently Resolved ({resolvedEmergencies.length})</h3>
                </div>
                <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                  {resolvedEmergencies.slice(0, 10).map((emergency) => (
                    <div key={emergency.id} className="p-4 flex items-center justify-between opacity-75">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{getEmergencyTypeIcon(emergency.aiAnalysis?.emergencyType || emergency.type)}</span>
                        <div>
                          <p className="font-medium text-gray-900">
                            {emergency.aiAnalysis?.title || emergency.description || 'Emergency Report'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {emergency.aiAnalysis?.location || emergency.location || 'Location unclear'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-gray-500">Resolved</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Map Tab */}
        {activeTab === 'map' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Locations Map</h3>
            <div className="bg-gray-100 h-96 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Interactive map would be integrated here</p>
                <p className="text-sm text-gray-500 mt-2">
                  Showing {activeEmergencies.length} active emergency locations
                </p>
              </div>
            </div>
            
            {/* Location List */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">Emergency Locations:</h4>
              <div className="space-y-2">
                {activeEmergencies.map((emergency) => (
                  <div key={emergency.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center space-x-3">
                      <span>{getEmergencyTypeIcon(emergency.aiAnalysis?.emergencyType || emergency.type)}</span>
                      <span className="font-medium">
                        {emergency.aiAnalysis?.location || emergency.location || 'Location unclear'}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(emergency.aiAnalysis?.type || emergency.priority)}`}>
                      {emergency.aiAnalysis?.type || emergency.priority || 'medium'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Emergency Detail Modal */}
      {selectedEmergency && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Emergency Details - {selectedEmergency.id}
              </h3>
              <button
                onClick={() => setSelectedEmergency(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {getEmergencyTypeIcon(selectedEmergency.aiAnalysis?.emergencyType || selectedEmergency.type)} {' '}
                    {selectedEmergency.aiAnalysis?.emergencyType || selectedEmergency.type || 'Unknown'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <span className={`mt-1 inline-block px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(selectedEmergency.aiAnalysis?.type || selectedEmergency.priority)}`}>
                    {selectedEmergency.aiAnalysis?.type || selectedEmergency.priority || 'medium'}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedEmergency.aiAnalysis?.location || selectedEmergency.location || 'Location unclear'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`mt-1 inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedEmergency.status)}`}>
                    {selectedEmergency.status || 'active'}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedEmergency.timestamp).toLocaleString()}
                  </p>
                </div>
                
                {selectedEmergency.contact && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmergency.contact}</p>
                  </div>
                )}
              </div>
              
              {selectedEmergency.aiAnalysis?.summary && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Summary</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedEmergency.aiAnalysis.summary}</p>
                </div>
              )}
              
              {selectedEmergency.aiAnalysis?.name && selectedEmergency.aiAnalysis.name !== 'Unknown' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Caller Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedEmergency.aiAnalysis.name}</p>
                </div>
              )}
              
              {selectedEmergency.aiAnalysis?.personDescription && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Person Description</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedEmergency.aiAnalysis.personDescription}</p>
                </div>
              )}
              
              {selectedEmergency.originalConversation && selectedEmergency.originalConversation.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Conversation History</label>
                  <div className="mt-1 max-h-40 overflow-y-auto border rounded p-3 bg-gray-50">
                    {selectedEmergency.originalConversation.map((msg, idx) => (
                      <div key={idx} className="mb-2">
                        <span className="font-medium text-xs text-gray-600 uppercase">
                          {msg.role}:
                        </span>
                        <p className="text-sm text-gray-800">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  updateEmergencyStatus(selectedEmergency.id, 'dispatching');
                  setSelectedEmergency(null);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Dispatch
              </button>
              
              <button
                onClick={() => {
                  const volunteerId = prompt('Enter volunteer ID:');
                  if (volunteerId) {
                    assignVolunteer(selectedEmergency.id, volunteerId);
                    setSelectedEmergency(null);
                  }
                }}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Assign Volunteer
              </button>
              
              <button
                onClick={() => {
                  resolveEmergency(selectedEmergency.id);
                  setSelectedEmergency(null);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Mark Resolved
              </button>
              
              <button
                onClick={() => setSelectedEmergency(null)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status Footer */}
      <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-3 border">
        <div className="flex items-center space-x-2 text-sm">
          <Activity className="h-4 w-4 text-blue-500" />
          <span className="font-medium">System Status:</span>
          <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {summary && (
          <div className="text-xs text-gray-500 mt-1">
            Last updated: {new Date(summary.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyDashboard;