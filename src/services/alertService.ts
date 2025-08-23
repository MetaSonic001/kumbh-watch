// Alert Service for managing alerts and preventing duplicates
export interface AlertData {
  id: string;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
  camera_id?: string;
  people_count?: number;
  threshold?: number;
  location?: any;
  anomaly_type?: string;
  hash?: string; // Unique hash for deduplication
}

export interface DeduplicationConfig {
  timeWindow: number; // Time window in milliseconds for deduplication
  similarityThreshold: number; // Threshold for considering alerts similar (0-1)
  maxRetries: number; // Maximum number of retries for the same alert type
}

class AlertService {
  private sentAlerts: Map<string, AlertData> = new Map();
  private alertCounts: Map<string, number> = new Map();
  private config: DeduplicationConfig;

  constructor(config?: Partial<DeduplicationConfig>) {
    this.config = {
      timeWindow: 5 * 60 * 1000, // 5 minutes default
      similarityThreshold: 0.8, // 80% similarity threshold
      maxRetries: 3, // Max 3 retries for same alert type
      ...config
    };

    // Clean up old alerts periodically
    this.startCleanupInterval();
  }

  /**
   * Generate a hash for an alert to identify duplicates
   */
  private generateAlertHash(alert: AlertData): string {
    const key = `${alert.type}_${alert.camera_id || 'unknown'}_${alert.anomaly_type || 'unknown'}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Check if an alert is similar to a previously sent alert
   */
  private isSimilarAlert(newAlert: AlertData, existingAlert: AlertData): boolean {
    // Check if it's the same type and camera
    if (newAlert.type !== existingAlert.type || newAlert.camera_id !== existingAlert.camera_id) {
      return false;
    }

    // Check if it's within the time window
    const timeDiff = Date.now() - new Date(existingAlert.timestamp).getTime();
    if (timeDiff > this.config.timeWindow) {
      return false;
    }

    // Check if it's the same anomaly type
    if (newAlert.anomaly_type && existingAlert.anomaly_type) {
      if (newAlert.anomaly_type !== existingAlert.anomaly_type) {
        return false;
      }
    }

    // Check people count similarity (within 20% threshold)
    if (newAlert.people_count && existingAlert.people_count) {
      const countDiff = Math.abs(newAlert.people_count - existingAlert.people_count);
      const countThreshold = Math.max(newAlert.people_count, existingAlert.people_count) * 0.2;
      if (countDiff > countThreshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if an alert should be sent (deduplication logic)
   */
  shouldSendAlert(alert: AlertData): { shouldSend: boolean; reason: string; existingAlert?: AlertData } {
    const alertHash = this.generateAlertHash(alert);
    const existingAlert = this.sentAlerts.get(alertHash);

    if (!existingAlert) {
      // New alert type, should send
      return { shouldSend: true, reason: 'New alert type' };
    }

    // Check if it's a similar alert within the time window
    if (this.isSimilarAlert(alert, existingAlert)) {
      const retryCount = this.alertCounts.get(alertHash) || 0;
      
      if (retryCount >= this.config.maxRetries) {
        return { 
          shouldSend: false, 
          reason: `Maximum retries (${this.config.maxRetries}) reached for this alert type`,
          existingAlert 
        };
      }

      // Allow retry but with cooldown
      const timeSinceLastAlert = Date.now() - new Date(existingAlert.timestamp).getTime();
      const cooldownPeriod = this.config.timeWindow * (retryCount + 1); // Increasing cooldown

      if (timeSinceLastAlert < cooldownPeriod) {
        return { 
          shouldSend: false, 
          reason: `Alert on cooldown. Retry in ${Math.ceil((cooldownPeriod - timeSinceLastAlert) / 1000)}s`,
          existingAlert 
        };
      }

      // Allow retry
      return { 
        shouldSend: true, 
        reason: `Retry ${retryCount + 1} of ${this.config.maxRetries}`,
        existingAlert 
      };
    }

    // Different alert, should send
    return { shouldSend: true, reason: 'Different alert parameters' };
  }

  /**
   * Mark an alert as sent
   */
  markAlertSent(alert: AlertData): void {
    const alertHash = this.generateAlertHash(alert);
    const existingAlert = this.sentAlerts.get(alertHash);
    
    if (existingAlert) {
      // Update existing alert
      this.sentAlerts.set(alertHash, {
        ...alert,
        hash: alertHash,
        timestamp: new Date().toISOString()
      });
      
      // Increment retry count
      const currentCount = this.alertCounts.get(alertHash) || 0;
      this.alertCounts.set(alertHash, currentCount + 1);
    } else {
      // New alert
      this.sentAlerts.set(alertHash, {
        ...alert,
        hash: alertHash
      });
      this.alertCounts.set(alertHash, 1);
    }

    console.log(`🚨 Alert sent: ${alert.type} (${alert.camera_id || 'unknown'}) - Hash: ${alertHash}`);
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): { totalAlerts: number; uniqueTypes: number; retryCounts: Record<string, number> } {
    const retryCounts: Record<string, number> = {};
    this.alertCounts.forEach((count, hash) => {
      retryCounts[hash] = count;
    });

    return {
      totalAlerts: this.sentAlerts.size,
      uniqueTypes: this.sentAlerts.size,
      retryCounts
    };
  }

  /**
   * Clear old alerts to prevent memory buildup
   */
  private cleanupOldAlerts(): void {
    const now = Date.now();
    const cutoffTime = now - this.config.timeWindow * 2; // Keep alerts for 2x time window

    for (const [hash, alert] of this.sentAlerts.entries()) {
      const alertTime = new Date(alert.timestamp).getTime();
      if (alertTime < cutoffTime) {
        this.sentAlerts.delete(hash);
        this.alertCounts.delete(hash);
      }
    }

    console.log(`🧹 Cleaned up old alerts. Current: ${this.sentAlerts.size} active`);
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupOldAlerts();
    }, this.config.timeWindow); // Clean up every time window
  }

  /**
   * Reset all alerts (useful for testing or system restart)
   */
  reset(): void {
    this.sentAlerts.clear();
    this.alertCounts.clear();
    console.log('🔄 Alert service reset');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DeduplicationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Alert service configuration updated:', this.config);
  }
}

// Export singleton instance
export const alertService = new AlertService();

// Export the class for testing or custom instances
export default AlertService;
