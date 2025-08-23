import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle, 
  Users, 
  Flame, 
  UserCheck, 
  Bell,
  Shield,
  Info,
  TestTube,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { alertService, AlertData } from "@/services/alertService";

const AlertDeduplicationDemo = () => {
  const [testAlert, setTestAlert] = useState<Partial<AlertData>>({
    type: 'crowd_density',
    severity: 'MEDIUM',
    message: 'Test alert message',
    camera_id: 'camera_001',
    people_count: 50,
    anomaly_type: 'threshold_breach'
  });

  const [deduplicationStats, setDeduplicationStats] = useState({
    totalAlerts: 0,
    uniqueTypes: 0,
    blockedDuplicates: 0
  });

  const updateStats = () => {
    const stats = alertService.getAlertStats();
    setDeduplicationStats({
      totalAlerts: stats.totalAlerts,
      uniqueTypes: stats.uniqueTypes,
      blockedDuplicates: 0
    });
  };

  const sendTestAlert = () => {
    if (!testAlert.type || !testAlert.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    const alertData: AlertData = {
      id: `test_${Date.now()}`,
      type: testAlert.type,
      severity: testAlert.severity || 'MEDIUM',
      message: testAlert.message,
      timestamp: new Date().toISOString(),
      camera_id: testAlert.camera_id,
      people_count: testAlert.people_count,
      anomaly_type: testAlert.anomaly_type
    };

    const result = alertService.shouldSendAlert(alertData);
    
    if (result.shouldSend) {
      alertService.markAlertSent(alertData);
      toast.success('Test alert sent successfully!', {
        description: result.reason
      });
    } else {
      toast.info('Test alert blocked (duplicate)', {
        description: result.reason
      });
    }

    updateStats();
  };

  const resetAlerts = () => {
    alertService.reset();
    updateStats();
    toast.success('All alerts reset');
  };

  const updateConfig = () => {
    alertService.updateConfig({
      timeWindow: 2 * 60 * 1000, // 2 minutes
      maxRetries: 2
    });
    toast.success('Configuration updated');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TestTube className="w-5 h-5 text-primary" />
          Alert Deduplication Demo
          <Badge variant="outline" className="ml-auto text-xs">
            Testing Tool
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Current Stats */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{deduplicationStats.totalAlerts}</div>
            <div className="text-xs text-muted-foreground">Total Alerts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary">{deduplicationStats.uniqueTypes}</div>
            <div className="text-xs text-muted-foreground">Unique Types</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{deduplicationStats.blockedDuplicates}</div>
            <div className="text-xs text-muted-foreground">Blocked</div>
          </div>
        </div>

        {/* Test Alert Form */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Test Alert Configuration</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="alertType">Alert Type</Label>
              <Select 
                value={testAlert.type} 
                onValueChange={(value) => setTestAlert(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crowd_density">Crowd Density</SelectItem>
                  <SelectItem value="anomaly">Anomaly</SelectItem>
                  <SelectItem value="fire">Fire Alert</SelectItem>
                  <SelectItem value="unauthorized">Unauthorized Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="severity">Severity</Label>
              <Select 
                value={testAlert.severity} 
                onValueChange={(value) => setTestAlert(prev => ({ ...prev, severity: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="cameraId">Camera ID</Label>
            <Input
              id="cameraId"
              value={testAlert.camera_id || ''}
              onChange={(e) => setTestAlert(prev => ({ ...prev, camera_id: e.target.value }))}
              placeholder="camera_001"
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Input
              id="message"
              value={testAlert.message || ''}
              onChange={(e) => setTestAlert(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Test alert message"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="peopleCount">People Count</Label>
              <Input
                id="peopleCount"
                type="number"
                value={testAlert.people_count || ''}
                onChange={(e) => setTestAlert(prev => ({ ...prev, people_count: parseInt(e.target.value) || 0 }))}
                placeholder="50"
              />
            </div>
            
            <div>
              <Label htmlFor="anomalyType">Anomaly Type</Label>
              <Input
                id="anomalyType"
                value={testAlert.anomaly_type || ''}
                onChange={(e) => setTestAlert(prev => ({ ...prev, anomaly_type: e.target.value }))}
                placeholder="threshold_breach"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={sendTestAlert} className="flex-1">
            <Bell className="w-4 h-4 mr-2" />
            Send Test Alert
          </Button>
          
          <Button variant="outline" onClick={updateStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Update Stats
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={resetAlerts} className="flex-1">
            <Shield className="w-4 h-4 mr-2" />
            Reset All Alerts
          </Button>
          
          <Button variant="outline" onClick={updateConfig}>
            <Info className="w-4 h-4 mr-2" />
            Update Config
          </Button>
        </div>

        {/* Instructions */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How to test deduplication:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Configure an alert with the same type, camera, and similar parameters</li>
                <li>Send the alert multiple times within the time window</li>
                <li>Watch how duplicates are blocked and retries are managed</li>
                <li>Check the console for detailed deduplication logs</li>
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertDeduplicationDemo;
