export interface ProcessingStage {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  estimatedTime?: number;
  error?: string;
}

export interface ProcessingUpdate {
  sessionId: string;
  stages: ProcessingStage[];
  overallProgress: number;
  currentStage: string;
  estimatedCompletion?: Date;
}

export class ProcessingUpdatesService {
  private static instance: ProcessingUpdatesService;
  private listeners: Map<string, (update: ProcessingUpdate) => void> = new Map();
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  static getInstance(): ProcessingUpdatesService {
    if (!this.instance) {
      this.instance = new ProcessingUpdatesService();
    }
    return this.instance;
  }

  connect(sessionId: string): void {
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? `wss://${window.location.host}/ws/processing`
      : 'ws://localhost:3001/ws/processing';

    try {
      this.websocket = new WebSocket(`${wsUrl}?sessionId=${sessionId}`);
      
      this.websocket.onopen = () => {
        console.log('Processing updates WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.websocket.onmessage = (event) => {
        try {
          const update: ProcessingUpdate = JSON.parse(event.data);
          this.notifyListeners(update);
        } catch (error) {
          console.error('Failed to parse processing update:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('Processing updates WebSocket disconnected');
        this.attemptReconnect(sessionId);
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to processing updates:', error);
    }
  }

  private attemptReconnect(sessionId: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect(sessionId);
      }, delay);
    }
  }

  subscribe(sessionId: string, callback: (update: ProcessingUpdate) => void): () => void {
    this.listeners.set(sessionId, callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(sessionId);
    };
  }

  private notifyListeners(update: ProcessingUpdate): void {
    const callback = this.listeners.get(update.sessionId);
    if (callback) {
      callback(update);
    }
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.listeners.clear();
  }

  // Simulate processing updates for development/testing
  simulateProcessing(sessionId: string): void {
    const stages: ProcessingStage[] = [
      { id: 'upload', name: 'File Upload', status: 'completed', progress: 100 },
      { id: 'ocr', name: 'Text Extraction', status: 'processing', progress: 45, estimatedTime: 30 },
      { id: 'parsing', name: 'Data Parsing', status: 'pending', progress: 0, estimatedTime: 20 },
      { id: 'analysis', name: 'Credit Analysis', status: 'pending', progress: 0, estimatedTime: 40 },
      { id: 'validation', name: 'Data Validation', status: 'pending', progress: 0, estimatedTime: 15 }
    ];

    let currentStageIndex = 1;
    
    const updateInterval = setInterval(() => {
      const currentStage = stages[currentStageIndex];
      
      if (currentStage.progress < 100) {
        currentStage.progress += Math.random() * 20;
        if (currentStage.progress >= 100) {
          currentStage.progress = 100;
          currentStage.status = 'completed';
          currentStageIndex++;
          
          if (currentStageIndex < stages.length) {
            stages[currentStageIndex].status = 'processing';
          }
        }
      }

      const overallProgress = stages.reduce((sum, stage) => sum + stage.progress, 0) / stages.length;
      
      const update: ProcessingUpdate = {
        sessionId,
        stages: [...stages],
        overallProgress,
        currentStage: currentStage.name,
        estimatedCompletion: new Date(Date.now() + (currentStage.estimatedTime || 0) * 1000)
      };

      this.notifyListeners(update);

      if (overallProgress >= 100) {
        clearInterval(updateInterval);
      }
    }, 2000);
  }
}