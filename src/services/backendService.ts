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

  async getZones(): Promise<BackendZone[]> {
    const response = await this.makeRequest(`${this.baseUrl}/zones`);
    
    return response;
  }

  async updateZone(zoneId: string, zoneData: Partial<BackendZone>): Promise<BackendZone> {
    const response = await this.makeRequest(`${this.baseUrl}/zones/${zoneId}`, {
      method: 'PUT',
      body: JSON.stringify(zoneData),
    });

    return response;
  }

  async deleteZone(zoneId: string): Promise<void> {
    await this.makeRequest(`${this.baseUrl}/zones/${zoneId}`, {
      method: 'DELETE',
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

  async getCameras(): Promise<BackendCamera[]> {
    const response = await this.makeRequest(`${this.baseUrl}/cameras`);
    
    return response;
  }

  async stopCamera(cameraId: string): Promise<void> {
    await this.makeRequest(`${this.baseUrl}/camera/${cameraId}/stop`, {
      method: 'POST',
    });
  }

  // Team Management
  async createTeam(teamData: Omit<BackendTeam, 'id' | 'created_at' | 'status'>): Promise<BackendTeam> {
    const response = await this.makeRequest(`${this.baseUrl}/teams`, {
      method: 'POST',
      body: JSON.stringify({
        ...teamData,
        status: 'active'
      }),
    });

    return response;
  }

  async getTeams(): Promise<BackendTeam[]> {
    const response = await this.makeRequest(`${this.baseUrl}/teams`);
    
    return response;
  }

  async updateTeam(teamId: string, teamData: Partial<BackendTeam>): Promise<BackendTeam> {
    const response = await this.makeRequest(`${this.baseUrl}/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(teamData),
    });

    return response;
  }

  async deleteTeam(teamId: string): Promise<void> {
    await this.makeRequest(`${this.baseUrl}/teams/${teamId}`, {
      method: 'DELETE',
    });
  }

  // Crowd Flow Analysis
  async getCrowdFlowData(): Promise<CrowdFlowData[]> {
    const response = await this.makeRequest(`${this.baseUrl}/crowd-flow`);
    
    return response;
  }

  async getZoneCrowdFlow(zoneId: string): Promise<CrowdFlowData> {
    const response = await this.makeRequest(`${this.baseUrl}/zones/${zoneId}/crowd-flow`);
    
    return response;
  }

  // Re-routing Suggestions
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

  // Intelligent Re-routing Logic
  calculateOptimalRoute(
    currentZone: CrowdFlowData,
    availableZones: CrowdFlowData[],
    userPreferences?: { maxWaitTime?: number; preferredZoneTypes?: string[] }
  ): ReRoutingSuggestion[] {
    const suggestions: ReRoutingSuggestion[] = [];
    
    // Filter out the current zone and zones with critical density
    const candidateZones = availableZones.filter(zone => 
      zone.zone_id !== currentZone.zone_id && 
      zone.density_level !== 'CRITICAL' &&
      zone.occupancy_percentage < 90
    );

    // Sort by optimal conditions
    const sortedZones = candidateZones.sort((a, b) => {
      // Priority 1: Lower density
      if (a.density_level !== b.density_level) {
        const densityPriority = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
        return densityPriority[a.density_level] - densityPriority[b.density_level];
      }
      
      // Priority 2: Lower occupancy percentage
      return a.occupancy_percentage - b.occupancy_percentage;
    });

    // Generate suggestions for top 3 zones
    sortedZones.slice(0, 3).forEach(zone => {
      const urgency = this.calculateUrgency(currentZone, zone);
      const estimatedWaitTime = this.estimateWaitTime(zone);
      
      suggestions.push({
        from_zone: currentZone.zone_id,
        to_zone: zone.zone_id,
        reason: this.generateReRoutingReason(currentZone, zone),
        urgency,
        estimated_wait_time: estimatedWaitTime,
        alternative_routes: this.findAlternativeRoutes(currentZone.zone_id, zone.zone_id, availableZones),
        crowd_conditions: {
          from_zone: currentZone,
          to_zone: zone
        }
      });
    });

    return suggestions;
  }

  private calculateUrgency(fromZone: CrowdFlowData, toZone: CrowdFlowData): 'low' | 'medium' | 'high' | 'critical' {
    const fromDensity = fromZone.density_level;
    const toDensity = toZone.density_level;
    
    if (fromDensity === 'CRITICAL' && toDensity === 'LOW') return 'critical';
    if (fromDensity === 'HIGH' && toDensity === 'LOW') return 'high';
    if (fromDensity === 'MEDIUM' && toDensity === 'LOW') return 'medium';
    return 'low';
  }

  private estimateWaitTime(zone: CrowdFlowData): number {
    // Simple estimation based on occupancy and density
    const baseWaitTime = 5; // minutes
    const occupancyMultiplier = zone.occupancy_percentage / 100;
    const densityMultiplier = { 'LOW': 1, 'MEDIUM': 1.5, 'HIGH': 2, 'CRITICAL': 3 }[zone.density_level];
    
    return Math.round(baseWaitTime * occupancyMultiplier * densityMultiplier);
  }

  private generateReRoutingReason(fromZone: CrowdFlowData, toZone: CrowdFlowData): string {
    if (fromZone.density_level === 'CRITICAL') {
      return `Critical crowd density detected. Redirecting to ${toZone.zone_name} for safety.`;
    }
    
    if (fromZone.occupancy_percentage > 80) {
      return `High occupancy (${fromZone.occupancy_percentage}%). ${toZone.zone_name} has better capacity.`;
    }
    
    return `Better crowd conditions at ${toZone.zone_name}. Estimated wait time: ${this.estimateWaitTime(toZone)} minutes.`;
  }

  private findAlternativeRoutes(fromZoneId: string, toZoneId: string, allZones: CrowdFlowData[]): string[] {
    // Simple alternative route finding
    const alternativeZones = allZones.filter(zone => 
      zone.zone_id !== fromZoneId && 
      zone.zone_id !== toZoneId &&
      zone.density_level === 'LOW'
    );
    
    return alternativeZones.slice(0, 2).map(zone => zone.zone_name);
  }

  // Add new methods for live map integration
  async getZonesWithHeatmap(): Promise<any[]> {
    const response = await this.makeRequest(`${this.baseUrl}/zones/heatmap`);
    
    return response;
  }
}

export const backendService = new BackendService();
export default backendService; 