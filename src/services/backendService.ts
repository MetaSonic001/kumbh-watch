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

  // Zone Management
  async createZone(zoneData: Omit<BackendZone, 'id' | 'created_at' | 'current_occupancy' | 'status'>): Promise<BackendZone> {
    const response = await fetch(`${this.baseUrl}/zones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...zoneData,
        status: 'active'
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create zone: ${response.statusText}`);
    }

    return response.json();
  }

  async getZones(): Promise<BackendZone[]> {
    const response = await fetch(`${this.baseUrl}/zones`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch zones: ${response.statusText}`);
    }

    return response.json();
  }

  async updateZone(zoneId: string, zoneData: Partial<BackendZone>): Promise<BackendZone> {
    const response = await fetch(`${this.baseUrl}/zones/${zoneId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(zoneData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update zone: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteZone(zoneId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/zones/${zoneId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete zone: ${response.statusText}`);
    }
  }

  // Camera Management
  async startCameraMonitoring(cameraData: {
    camera_id: string;
    rtsp_url: string;
    threshold: number;
    zone_id: string;
  }): Promise<BackendCamera> {
    const response = await fetch(`${this.baseUrl}/monitor/rtsp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cameraData),
    });

    if (!response.ok) {
      throw new Error(`Failed to start camera monitoring: ${response.statusText}`);
    }

    return response.json();
  }

  async getCameras(): Promise<BackendCamera[]> {
    const response = await fetch(`${this.baseUrl}/cameras`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch cameras: ${response.statusText}`);
    }

    return response.json();
  }

  async stopCamera(cameraId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/camera/${cameraId}/stop`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to stop camera: ${response.statusText}`);
    }
  }

  // Team Management
  async createTeam(teamData: Omit<BackendTeam, 'id' | 'created_at' | 'status'>): Promise<BackendTeam> {
    const response = await fetch(`${this.baseUrl}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...teamData,
        status: 'active'
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create team: ${response.statusText}`);
    }

    return response.json();
  }

  async getTeams(): Promise<BackendTeam[]> {
    const response = await fetch(`${this.baseUrl}/teams`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch teams: ${response.statusText}`);
    }

    return response.json();
  }

  async updateTeam(teamId: string, teamData: Partial<BackendTeam>): Promise<BackendTeam> {
    const response = await fetch(`${this.baseUrl}/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(teamData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update team: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteTeam(teamId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/teams/${teamId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete team: ${response.statusText}`);
    }
  }

  // Crowd Flow Analysis
  async getCrowdFlowData(): Promise<CrowdFlowData[]> {
    const response = await fetch(`${this.baseUrl}/crowd-flow`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch crowd flow data: ${response.statusText}`);
    }

    return response.json();
  }

  async getZoneCrowdFlow(zoneId: string): Promise<CrowdFlowData> {
    const response = await fetch(`${this.baseUrl}/zones/${zoneId}/crowd-flow`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch zone crowd flow: ${response.statusText}`);
    }

    return response.json();
  }

  // Re-routing Suggestions
  async getReRoutingSuggestions(zoneId?: string): Promise<ReRoutingSuggestion[]> {
    const url = zoneId 
      ? `${this.baseUrl}/re-routing-suggestions?zone_id=${zoneId}`
      : `${this.baseUrl}/re-routing-suggestions`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch re-routing suggestions: ${response.statusText}`);
    }

    return response.json();
  }

  async generateReRoutingSuggestion(fromZoneId: string, toZoneId: string): Promise<ReRoutingSuggestion> {
    const response = await fetch(`${this.baseUrl}/re-routing-suggestions/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from_zone_id: fromZoneId,
        to_zone_id: toZoneId
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate re-routing suggestion: ${response.statusText}`);
    }

    return response.json();
  }

  // System Status
  async getSystemStatus(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/status`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch system status: ${response.statusText}`);
    }

    return response.json();
  }

  // Emergency Alerts
  async sendEmergencyAlert(alertData: {
    emergency_type: string;
    message: string;
    location: string;
    priority: string;
    zone_id?: string;
  }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/emergency`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(alertData),
    });

    if (!response.ok) {
      throw new Error(`Failed to send emergency alert: ${response.statusText}`);
    }
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
    const response = await fetch(`${this.baseUrl}/zones/heatmap`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch zones with heatmap: ${response.statusText}`);
    }

    return response.json();
  }
}

export const backendService = new BackendService();
export default backendService; 