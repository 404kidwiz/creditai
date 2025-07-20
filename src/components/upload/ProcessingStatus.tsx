'use client';

import React, { useEffect, useState } from 'react';
import { ProcessingUpdatesService, ProcessingUpdate, ProcessingStage } from '@/lib/realtime/processingUpdates';
import { AnalysisLoading } from '@/components/ui/EnhancedLoadingStates';
import { Skeleton } from '@/components/ui/SkeletonScreens';

interface ProcessingStatusProps {
  sessionId: string;
  onComplete?: (data: any) => void;
  className?: string;
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  sessionId,
  onComplete,
  className = ''
}) => {
  const [update, setUpdate] = useState<ProcessingUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const service = ProcessingUpdatesService.getInstance();
    
    const unsubscribe = service.subscribe(sessionId, (processingUpdate) => {
      setUpdate(processingUpdate);
      setIsConnected(true);
      
      if (processingUpdate.overallProgress >= 100 && onComplete) {
        onComplete(processingUpdate);
      }
    });

    // Connect to WebSocket
    service.connect(sessionId);

    // For development - simulate processing
    if (process.env.NODE_ENV === 'development') {
      service.simulateProcessing(sessionId);
    }

    return () => {
      unsubscribe();
    };
  }, [sessionId, onComplete]);

  if (!update) {
    return (
      <div className={className}>
        <AnalysisLoading 
          onComplete={() => {
            // This will be handled by the real update system
          }}
        />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Processing Credit Report</h3>
          <span className="text-sm text-gray-500">
            {Math.round(update.overallProgress)}% Complete
          </span>
        </div>
        
        {/* Overall Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${update.overallProgress}%` }}
          />
        </div>
        
        {update.estimatedCompletion && (
          <p className="text-sm text-gray-500 mt-2">
            Estimated completion: {update.estimatedCompletion.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Processing Stages */}
      <div className="space-y-3">
        {update.stages.map((stage) => (
          <ProcessingStageItem key={stage.id} stage={stage} />
        ))}
      </div>

      {/* Connection Status */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center text-sm">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
};

const ProcessingStageItem: React.FC<{ stage: ProcessingStage }> = ({ stage }) => {
  const getStatusIcon = () => {
    switch (stage.status) {
      case 'completed':
        return <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>;
      case 'processing':
        return <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      case 'error':
        return <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>;
      default:
        return <div className="w-5 h-5 bg-gray-300 rounded-full" />;
    }
  };

  return (
    <div className="flex items-center space-x-3">
      {getStatusIcon()}
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <span className={`text-sm font-medium ${
            stage.status === 'error' ? 'text-red-600' : 'text-gray-900'
          }`}>
            {stage.name}
          </span>
          {stage.status === 'processing' && stage.estimatedTime && (
            <span className="text-xs text-gray-500">
              ~{stage.estimatedTime}s remaining
            </span>
          )}
        </div>
        
        {stage.status === 'processing' && (
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
            <div
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${stage.progress}%` }}
            />
          </div>
        )}
        
        {stage.error && (
          <p className="text-xs text-red-600 mt-1">{stage.error}</p>
        )}
      </div>
    </div>
  );
};