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
      console.log(`🌐 Making request to: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          ...options?.headers,
        },
        mode: 'cors',
        credentials: 'omit',
        ...options,
      });

      console.log(`📡 Response status: ${response.status} ${response.statusText}`);
      console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP ${response.status}: ${errorText}`);
        
        // Handle ngrok-specific errors
        if (errorText.includes('ngrok') || errorText.includes('<!DOCTYPE html>')) {
          throw new Error(`Ngrok tunnel issue: Received HTML instead of JSON. Status: ${response.status}`);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      console.log(`📋 Content-Type: ${contentType}`);
      
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        console.log(`✅ JSON response received:`, result);
        return result;
      } else {
        const text = await response.text();
        console.error('❌ Non-JSON response received:', text.substring(0, 500));
        
        // Check if it's an ngrok error page
        if (text.includes('ngrok') || text.includes('<!DOCTYPE html>')) {
          throw new Error('Ngrok tunnel issue: Received HTML error page instead of API response. The tunnel may be expired or misconfigured.');
        }
        
        throw new Error('Server returned non-JSON response. Check if the API endpoint exists and the server is running correctly.');
      }
    } catch (error) {
      console.error(`❌ Request failed for ${url}:`, error);
      
      // Provide more helpful error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Cannot connect to the backend. Check if the ngrok tunnel is active and accessible.');
      }
      
      throw error;
    }
  }

  // Test connection to backend
  async testConnection(): Promise<{ status: string; message: string; details?: any }> {
    try {
      console.log('🧪 Testing backend connection...');
      
      // Test basic endpoint
      const response = await this.makeRequest(`${this.baseUrl}/`);
      
      return {
        status: 'success',
        message: 'Backend connection successful',
        details: {
          version: response.version,
          endpoints: Object.keys(response.endpoints),
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('❌ Backend connection test failed:', error);
      
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {
          url: this.baseUrl,
          timestamp: new Date().toISOString(),
          error: error
        }
      };
    }
  }
  async getCrowdFlowData(): Promise<CrowdFlowData[]> {
    const response = await this.makeRequest(`${this.baseUrl}/crowd-flow-data`);
    return response;
  }
  // Test zones endpoint specifically
  async testZonesEndpoint(): Promise<{ status: string; message: string; details?: any }> {
    try {
      console.log('🧪 Testing zones endpoint specifically...');
      
      // Test zones endpoint
      const response = await this.makeRequest(`${this.baseUrl}/zones/heatmap`);
      
      return {
        status: 'success',
        message: 'Zones endpoint working',
        details: {
          zones_count: response.length,
          sample_zone: response[0] ? {
            id: response[0].id,
            name: response[0].name,
            type: response[0].type
          } : null,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('❌ Zones endpoint test failed:', error);
      
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {
          url: `${this.baseUrl}/zones/heatmap`,
          timestamp: new Date().toISOString(),
          error: error
        }
      };
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

  async getZones(): Promise<BackendZone[]> {
    const response = await this.makeRequest(`${this.baseUrl}/zones/heatmap`);
    return response;
  }

  async deleteZone(zoneId: string): Promise<void> {
    await this.makeRequest(`${this.baseUrl}/zones/${zoneId}`, {
      method: 'DELETE',
    });
  }

  // Re-routing Management
  async getReRoutingSuggestions(zoneId?: string): Promise<ReRoutingSuggestion[]> {
    const url = zoneId 
      ? `${this.baseUrl}/re-routing-suggestions?zone_id=${zoneId}`
      : `${this.baseUrl}/re-routing-suggestions`;
    
    const response = await this.makeRequest(url);
    return response;
  }

  async generateReRoutingSuggestion(fromZoneId: string, toZoneId: string): Promise<ReRoutingSuggestion> {
    const response = await this.makeRequest(`${this.baseUrl}/re-routing-suggestions/generate`, {
      method: 'POST',
      body: JSON.stringify({
        from_zone_id: fromZoneId,
        to_zone_id: toZoneId
      }),
    });
    return response;
  }

  async sendEmergencyInstructions(instructions: string, priority: string = 'HIGH', duration: number = 300): Promise<void> {
    const params = new URLSearchParams({
      instructions,
      priority,
      duration: duration.toString()
    });
  
    await this.makeRequest(`${this.baseUrl}/instructions?${params.toString()}`, {
      method: 'POST',
    });
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

  // Add this method to your BackendService class
  calculateOptimalRoute(currentZone: CrowdFlowData, allZones: CrowdFlowData[]): ReRoutingSuggestion[] {
    // Filter out current zone and find better alternatives
    const candidateZones = allZones.filter(zone => 
      zone.zone_id !== currentZone.zone_id &&
      zone.density_level !== 'CRITICAL' &&
      zone.occupancy_percentage < 90
    );

    // Sort by best conditions (lowest density and occupancy)
    candidateZones.sort((a, b) => {
      const densityWeight = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
      const aDensity = densityWeight[a.density_level];
      const bDensity = densityWeight[b.density_level];
    
      if (aDensity !== bDensity) return aDensity - bDensity;
      return a.occupancy_percentage - b.occupancy_percentage;
    });

    // Generate suggestions for top 3 zones
    return candidateZones.slice(0, 3).map(toZone => ({
      from_zone: currentZone.zone_id,
      to_zone: toZone.zone_id,
      reason: this.generateReRoutingReason(currentZone, toZone),
      urgency: this.calculateUrgency(currentZone, toZone),
      estimated_wait_time: this.estimateWaitTime(toZone),
      alternative_routes: candidateZones.slice(3, 5).map(zone => zone.zone_name),
      crowd_conditions: {
        from_zone: currentZone,
        to_zone: toZone
      }
    }));
  }

  // Add these helper methods too
  private generateReRoutingReason(fromZone: CrowdFlowData, toZone: CrowdFlowData): string {
    if (fromZone.density_level === 'CRITICAL') {
      return `Critical crowd density detected. Redirecting to ${toZone.zone_name} for safety.`;
    }
  
    if (fromZone.occupancy_percentage > 80) {
      return `High occupancy (${fromZone.occupancy_percentage}%). ${toZone.zone_name} has better capacity.`;
    }
  
    return `Better crowd conditions at ${toZone.zone_name}. Estimated wait time: ${this.estimateWaitTime(toZone)} minutes.`;
  }

  private calculateUrgency(fromZone: CrowdFlowData, toZone: CrowdFlowData): 'low' | 'medium' | 'high' | 'critical' {
    if (fromZone.density_level === 'CRITICAL' && toZone.density_level === 'LOW') return 'critical';
    if (fromZone.density_level === 'HIGH' && toZone.density_level === 'LOW') return 'high';
    if (fromZone.density_level === 'MEDIUM' && toZone.density_level === 'LOW') return 'medium';
    return 'low';
  }

  private estimateWaitTime(zone: CrowdFlowData): number {
    const baseWaitTime = 5;
    const occupancyMultiplier = zone.occupancy_percentage / 100;
    const densityMultiplier = { 'LOW': 1, 'MEDIUM': 1.5, 'HIGH': 2, 'CRITICAL': 3 }[zone.density_level];
  
    return Math.round(baseWaitTime * occupancyMultiplier * densityMultiplier);
  }
}



export const backendService = new BackendService();
export default backendService; 