import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Zone {
  id: string;
  name: string;
  type: 'ghat' | 'gate' | 'camp' | 'medical' | 'security';
  coordinates: { x: number; y: number };
  capacity: number;
  description: string;
}

interface CCTVCamera {
  id: string;
  name: string;
  zoneId: string;
  rtspUrl: string;
  position: { x: number; y: number };
  status: 'online' | 'offline' | 'maintenance';
}

interface Team {
  id: string;
  name: string;
  type: 'police' | 'medical' | 'volunteer' | 'security';
  memberCount: number;
  assignedZones: string[];
  leader: string;
  contactInfo: string;
}

interface SetupState {
  // Setup progress
  currentStep: number;
  completedSteps: number[];
  
  // Zone setup data
  zones: Zone[];
  
  // CCTV setup data  
  cameras: CCTVCamera[];
  
  // Team setup data
  teams: Team[];
  
  // Configuration
  eventName: string;
  eventDate: string;
  totalCapacity: number;
  
  // Setup completion
  isSetupComplete: boolean;
}

interface SetupContextType {
  state: SetupState;
  
  // Step management
  setCurrentStep: (step: number) => void;
  markStepCompleted: (step: number) => void;
  
  // Zone management
  addZone: (zone: Omit<Zone, 'id'>) => void;
  updateZone: (id: string, updates: Partial<Zone>) => void;
  removeZone: (id: string) => void;
  
  // CCTV management
  addCamera: (camera: Omit<CCTVCamera, 'id'>) => void;
  updateCamera: (id: string, updates: Partial<CCTVCamera>) => void;
  removeCamera: (id: string) => void;
  
  // Team management
  addTeam: (team: Omit<Team, 'id'>) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  removeTeam: (id: string) => void;
  
  // Configuration
  updateConfig: (config: Partial<Pick<SetupState, 'eventName' | 'eventDate' | 'totalCapacity'>>) => void;
  
  // Setup completion
  completeSetup: () => void;
  resetSetup: () => void;
}

const initialState: SetupState = {
  currentStep: 1,
  completedSteps: [],
  zones: [],
  cameras: [],
  teams: [],
  eventName: '',
  eventDate: '',
  totalCapacity: 0,
  isSetupComplete: false,
};

const SetupContext = createContext<SetupContextType | undefined>(undefined);

export const useSetup = () => {
  const context = useContext(SetupContext);
  if (!context) {
    throw new Error('useSetup must be used within a SetupProvider');
  }
  return context;
};

interface SetupProviderProps {
  children: ReactNode;
}

export const SetupProvider: React.FC<SetupProviderProps> = ({ children }) => {
  const [state, setState] = useState<SetupState>(initialState);

  const setCurrentStep = (step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const markStepCompleted = (step: number) => {
    setState(prev => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, step])]
    }));
  };

  const addZone = (zone: Omit<Zone, 'id'>) => {
    const newZone: Zone = {
      ...zone,
      id: `zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setState(prev => ({
      ...prev,
      zones: [...prev.zones, newZone]
    }));
  };

  const updateZone = (id: string, updates: Partial<Zone>) => {
    setState(prev => ({
      ...prev,
      zones: prev.zones.map(zone => 
        zone.id === id ? { ...zone, ...updates } : zone
      )
    }));
  };

  const removeZone = (id: string) => {
    setState(prev => ({
      ...prev,
      zones: prev.zones.filter(zone => zone.id !== id),
      cameras: prev.cameras.filter(camera => camera.zoneId !== id)
    }));
  };

  const addCamera = (camera: Omit<CCTVCamera, 'id'>) => {
    const newCamera: CCTVCamera = {
      ...camera,
      id: `camera-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setState(prev => ({
      ...prev,
      cameras: [...prev.cameras, newCamera]
    }));
  };

  const updateCamera = (id: string, updates: Partial<CCTVCamera>) => {
    setState(prev => ({
      ...prev,
      cameras: prev.cameras.map(camera => 
        camera.id === id ? { ...camera, ...updates } : camera
      )
    }));
  };

  const removeCamera = (id: string) => {
    setState(prev => ({
      ...prev,
      cameras: prev.cameras.filter(camera => camera.id !== id)
    }));
  };

  const addTeam = (team: Omit<Team, 'id'>) => {
    const newTeam: Team = {
      ...team,
      id: `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setState(prev => ({
      ...prev,
      teams: [...prev.teams, newTeam]
    }));
  };

  const updateTeam = (id: string, updates: Partial<Team>) => {
    setState(prev => ({
      ...prev,
      teams: prev.teams.map(team => 
        team.id === id ? { ...team, ...updates } : team
      )
    }));
  };

  const removeTeam = (id: string) => {
    setState(prev => ({
      ...prev,
      teams: prev.teams.filter(team => team.id !== id)
    }));
  };

  const updateConfig = (config: Partial<Pick<SetupState, 'eventName' | 'eventDate' | 'totalCapacity'>>) => {
    setState(prev => ({ ...prev, ...config }));
  };

  const completeSetup = () => {
    setState(prev => ({ 
      ...prev, 
      isSetupComplete: true,
      completedSteps: [1, 2, 3, 4]
    }));
  };

  const resetSetup = () => {
    setState(initialState);
  };

  const contextValue: SetupContextType = {
    state,
    setCurrentStep,
    markStepCompleted,
    addZone,
    updateZone,
    removeZone,
    addCamera,
    updateCamera,
    removeCamera,
    addTeam,
    updateTeam,
    removeTeam,
    updateConfig,
    completeSetup,
    resetSetup,
  };

  return (
    <SetupContext.Provider value={contextValue}>
      {children}
    </SetupContext.Provider>
  );
};

export default SetupContext;