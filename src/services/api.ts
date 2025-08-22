// src/services/api.ts
import axios from 'axios';

const API_BASE_URL = 'https://171ccf457218.ngrok-free.app';
const WS_BASE_URL = 'ws://171ccf457218.ngrok-free.app';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API Types
export interface CrowdData {
  zone_id: string;
  people_count: number;
  density_level: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  coordinates: [number, number];
}

export interface CCTVFeed {
  id: string;
  name: string;
  location: string;
  rtsp_url: string;
  status: 'online' | 'offline' | 'maintenance';
  people_count: number;
  alert_level: 'low' | 'medium' | 'high' | 'critical';
  last_update: string;
  coordinates: [number, number];
}

export interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  zone: string;
  type: string;
  timestamp: string;
  description: string;
  acknowledged: boolean;
  coordinates?: [number, number];
}

export interface PoseDetection {
  person_id: string;
  keypoints: Array<{x: number, y: number, confidence: number}>;
  bbox: [number, number, number, number];
  timestamp: string;
}

export interface AnomalyDetection {
  id: string;
  type: 'violence' | 'stampede' | 'unusual_crowd' | 'suspicious_activity';
  confidence: number;
  zone: string;
  timestamp: string;
  description: string;
  coordinates: [number, number];
}

// API Service Class
export class ApiService {
  private static instance: ApiService;
  private wsConnections: Map<string, WebSocket> = new Map();

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // CCTV Management
  async getCCTVFeeds(): Promise<CCTVFeed[]> {
    const response = await api.get('/api/cctv/feeds');
    return response.data;
  }

  async updateCCTVConfig(feedId: string, config: {rtsp_url: string, name: string}): Promise<void> {
    await api.put(`/api/cctv/feeds/${feedId}`, config);
  }

  async startCCTVStream(feedId: string): Promise<void> {
    await api.post(`/api/cctv/feeds/${feedId}/start`);
  }

  async stopCCTVStream(feedId: string): Promise<void> {
    await api.post(`/api/cctv/feeds/${feedId}/stop`);
  }

  // Crowd Management
  async getCrowdData(): Promise<CrowdData[]> {
    const response = await api.get('/api/crowd/data');
    return response.data;
  }

  async getHeatmapData(): Promise<{zone_id: string, intensity: number, coordinates: [number, number]}[]> {
    const response = await api.get('/api/crowd/heatmap');
    return response.data;
  }

  // Alerts Management
  async getAlerts(): Promise<Alert[]> {
    const response = await api.get('/api/alerts');
    return response.data;
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    await api.put(`/api/alerts/${alertId}/acknowledge`);
  }

  async sendAlert(alert: {type: string, zone: string, message: string, severity: string}): Promise<void> {
    await api.post('/api/alerts', alert);
  }

  async sendEmergencyBroadcast(message: string, zones?: string[]): Promise<void> {
    await api.post('/api/emergency/broadcast', { message, zones });
  }

  // Pose Detection
  async getPoseDetections(feedId: string): Promise<PoseDetection[]> {
    const response = await api.get(`/api/detection/pose/${feedId}`);
    return response.data;
  }

  async enablePoseDetection(feedId: string, enabled: boolean): Promise<void> {
    await api.put(`/api/detection/pose/${feedId}`, { enabled });
  }

  // Anomaly Detection
  async getAnomalies(): Promise<AnomalyDetection[]> {
    const response = await api.get('/api/detection/anomalies');
    return response.data;
  }

  async configureAnomalyDetection(config: {
    violence_threshold: number,
    crowd_threshold: number,
    enabled_zones: string[]
  }): Promise<void> {
    await api.put('/api/detection/anomalies/config', config);
  }

  // WebSocket Connections
  connectToFeed(feedId: string, onMessage: (data: any) => void): WebSocket {
    const wsUrl = `${WS_BASE_URL}/ws/cctv/${feedId}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log(`Connected to feed ${feedId}`);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    
    ws.onclose = () => {
      console.log(`Disconnected from feed ${feedId}`);
      this.wsConnections.delete(feedId);
    };
    
    ws.onerror = (error) => {
      console.error(`WebSocket error for feed ${feedId}:`, error);
    };
    
    this.wsConnections.set(feedId, ws);
    return ws;
  }

  connectToAlerts(onMessage: (alert: Alert) => void): WebSocket {
    const wsUrl = `${WS_BASE_URL}/ws/alerts`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Connected to alerts stream');
    };
    
    ws.onmessage = (event) => {
      const alert = JSON.parse(event.data);
      onMessage(alert);
    };
    
    ws.onclose = () => {
      console.log('Disconnected from alerts stream');
    };
    
    return ws;
  }

  connectToCrowdData(onMessage: (data: CrowdData) => void): WebSocket {
    const wsUrl = `${WS_BASE_URL}/ws/crowd`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Connected to crowd data stream');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    
    ws.onclose = () => {
      console.log('Disconnected from crowd data stream');
    };
    
    return ws;
  }

  disconnectFromFeed(feedId: string): void {
    const ws = this.wsConnections.get(feedId);
    if (ws) {
      ws.close();
      this.wsConnections.delete(feedId);
    }
  }

  disconnectAll(): void {
    this.wsConnections.forEach((ws) => ws.close());
    this.wsConnections.clear();
  }
}

export default ApiService.getInstance();