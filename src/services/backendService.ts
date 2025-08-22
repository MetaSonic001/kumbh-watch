import { API_URL } from "@/config";

export interface BackendZone {
  id: string;
  name: string;
  type: string;
  coordinates: { lng: number; lat: number };
  capacity: number;
  description: string;
  current_occupancy: number;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
}

export interface BackendCamera {
  id: string;
  name: string;
  zone_id: string;
  rtsp_url: string;
  status: 'active' | 'stopped' | 'error';
  people_count: number;
  threshold: number;
  last_frame?: string;
  created_at: string;
}

export interface BackendTeam {
  id: string;
  name: string;
  role: string;
  zone_id: string;
  contact: string;
  status: 'active' | 'offline' | 'busy';
  created_at: string;
}

export interface CrowdFlowData {
  zone_id: string;
  zone_name: string;
  current_occupancy: number;
  capacity: number;
  occupancy_percentage: number;
  people_count: number;
  density_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  trend: 'increasing' | 'decreasing' | 'stable';
  last_update: string;
}

export interface ReRoutingSuggestion {
  from_zone: string;
  to_zone: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimated_wait_time: number;
  alternative_routes: string[];
  crowd_conditions: {
    from_zone: CrowdFlowData;
    to_zone: CrowdFlowData;
  };
}

class BackendService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  // Helper method for better error handling
  private async makeRequest(url: string, options?: RequestInit): Promise<any> {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP ${response.status}: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response. Check if the API endpoint exists and the server is running correctly.');
      }
    } catch (error) {
      console.error(`Request failed for ${url}:`, error);
      throw error;
    }
  }

  // Zone Management
  async createZone(zoneData: Omit<BackendZone, 'id' | 'created_at' | 'current_occupancy' | 'status'>): Promise<BackendZone> {
    const response = await this.makeRequest(`${this.baseUrl}/zones`, {
      method: 'POST',
      body: JSON.stringify({
        ...zoneData,
        status: 'active'
      }),
    });

    return response;
  }

  // Camera Management
  async startCameraMonitoring(cameraData: {
    camera_id: string;
    rtsp_url: string;
    threshold: number;
    zone_id: string;
  }): Promise<BackendCamera> {
    const response = await this.makeRequest(`${this.baseUrl}/monitor/rtsp`, {
      method: 'POST',
      body: JSON.stringify(cameraData),
    });

    return response;
  }

  async stopCamera(cameraId: string): Promise<void> {
    await this.makeRequest(`${this.baseUrl}/camera/${cameraId}/stop`, {
      method: 'POST',
    });
  }

  // System Status
  async getSystemStatus(): Promise<any> {
    const response = await this.makeRequest(`${this.baseUrl}/status`);
    
    return response;
  }

  // Emergency Alerts
  async sendEmergencyAlert(alertData: {
    emergency_type: string;
    message: string;
    location: string;
    priority: string;
    zone_id?: string;
  }): Promise<void> {
    await this.makeRequest(`${this.baseUrl}/emergency`, {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  }

  // Add new methods for live map integration
  async getZonesWithHeatmap(): Promise<any[]> {
    const response = await this.makeRequest(`${this.baseUrl}/zones/heatmap`);
    
    return response;
  }
}

export const backendService = new BackendService();
export default backendService; 