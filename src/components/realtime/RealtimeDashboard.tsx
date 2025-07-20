/**
 * Real-time Dashboard Component
 * 
 * Comprehensive dashboard that showcases all real-time features including
 * credit monitoring, notifications, dispute tracking, chat, and collaboration.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  useRealtime, 
  useCreditMonitoring, 
  useNotifications, 
  useDisputeTracking, 
  useChat 
} from '../../hooks/useRealtime';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { useAuth } from '../../hooks/useAuth';

interface RealtimeDashboardProps {
  className?: string;
}

interface CreditScoreDisplayProps {
  score: number;
  change: number;
  bureau: string;
}

interface NotificationItemProps {
  notification: any;
  onMarkRead: (id: string) => void;
}

interface DisputeItemProps {
  dispute: any;
  onUpdateStatus: (id: string, status: string) => void;
}

interface ChatWindowProps {
  session: any;
  messages: any[];
  onSendMessage: (message: string) => void;
  onEndChat: () => void;
}

const CreditScoreDisplay: React.FC<CreditScoreDisplayProps> = ({ score, change, bureau }) => {
  const getScoreColor = (score: number) => {
    if (score >= 800) return 'text-green-600';
    if (score >= 740) return 'text-blue-600';
    if (score >= 670) return 'text-yellow-600';
    if (score >= 580) return 'text-orange-600';
    return 'text-red-600';
  };

  const getChangeColor = (change: number) => {
    return change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600';
  };

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h4 className="font-semibold text-gray-800 capitalize">{bureau}</h4>
      <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
        {score}
      </div>
      <div className={`text-sm ${getChangeColor(change)}`}>
        {change > 0 ? '+' : ''}{change} points
      </div>
    </div>
  );
};

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkRead }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'normal': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className={`p-3 border-l-4 ${getPriorityColor(notification.priority)} mb-2`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h5 className="font-medium text-gray-900">{notification.title}</h5>
          <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
          <span className="text-xs text-gray-500">
            {new Date(notification.createdAt).toLocaleString()}
          </span>
        </div>
        {!notification.isRead && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onMarkRead(notification.id)}
          >
            Mark Read
          </Button>
        )}
      </div>
    </div>
  );
};

const DisputeItem: React.FC<DisputeItemProps> = ({ dispute, onUpdateStatus }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'sent': return 'text-yellow-600 bg-yellow-100';
      case 'draft': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex justify-between items-start mb-2">
        <h5 className="font-medium text-gray-900">Dispute #{dispute.disputeId.slice(-8)}</h5>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.currentStatus)}`}>
          {dispute.currentStatus.replace('_', ' ')}
        </span>
      </div>
      <div className="mb-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${dispute.progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">{dispute.progress}% complete</span>
      </div>
      {dispute.nextAction && (
        <div className="text-sm text-gray-600 mb-2">
          Next: {dispute.nextAction.description}
        </div>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUpdateStatus(dispute.disputeId, 'in_progress')}
        >
          Update Status
        </Button>
      </div>
    </div>
  );
};

const ChatWindow: React.FC<ChatWindowProps> = ({ session, messages, onSendMessage, onEndChat }) => {
  const [messageInput, setMessageInput] = useState('');

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      onSendMessage(messageInput);
      setMessageInput('');
    }
  };

  return (
    <div className="flex flex-col h-96 border rounded-lg bg-white">
      <div className="p-3 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">Chat Support</h4>
          {session && (
            <Button size="sm" variant="outline" onClick={onEndChat}>
              End Chat
            </Button>
          )}
        </div>
        {session && (
          <span className="text-sm text-gray-600">
            Status: {session.status} | Topic: {session.topic || 'General Support'}
          </span>
        )}
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto">
        {messages.map((message) => (
          <div key={message.id} className={`mb-2 ${message.senderRole === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-2 rounded-lg max-w-xs ${
              message.senderRole === 'user' 
                ? 'bg-blue-600 text-white' 
                : message.senderRole === 'system'
                ? 'bg-gray-200 text-gray-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              <div className="text-sm">{message.content}</div>
              <div className="text-xs opacity-75 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={handleSendMessage}>Send</Button>
        </div>
      </div>
    </div>
  );
};

export const RealtimeDashboard: React.FC<RealtimeDashboardProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Real-time hooks
  const { isConnected, status, initialize, toggleFeature, manager } = useRealtime();
  const {
    latestUpdate,
    pendingAlerts,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    simulateUpdate
  } = useCreditMonitoring(user?.id || '');
  
  const {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    subscribeToPush
  } = useNotifications(user?.id || '');
  
  const {
    disputes,
    metrics: disputeMetrics,
    isTracking,
    startTracking,
    stopTracking,
    updateDisputeStatus,
    simulateUpdate: simulateDisputeUpdate
  } = useDisputeTracking(user?.id || '');
  
  const {
    session: chatSession,
    messages: chatMessages,
    startChat,
    sendMessage: sendChatMessage,
    endChat
  } = useChat(user?.id || '');

  // Initialize real-time features
  useEffect(() => {
    if (user && !isInitialized) {
      const initializeRealtime = async () => {
        try {
          await initialize({
            userId: user.id,
            enableCreditMonitoring: true,
            enableNotifications: true,
            enableDisputeTracking: true,
            enableChat: true,
            enableCollaboration: true
          });
          setIsInitialized(true);
        } catch (error) {
          console.error('Failed to initialize real-time features:', error);
        }
      };

      initializeRealtime();
    }
  }, [user, isInitialized, initialize]);

  const handleFeatureToggle = async (feature: string, enabled: boolean) => {
    try {
      await toggleFeature(feature, enabled);
    } catch (error) {
      console.error(`Failed to toggle ${feature}:`, error);
    }
  };

  const handleStartChat = async () => {
    try {
      await startChat('Real-time Dashboard Support');
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'credit', label: 'Credit Monitoring' },
    { id: 'notifications', label: `Notifications (${unreadCount})` },
    { id: 'disputes', label: 'Disputes' },
    { id: 'chat', label: 'Chat Support' }
  ];

  if (!user) {
    return (
      <Alert>
        Please log in to access real-time features.
      </Alert>
    );
  }

  return (
    <div className={`real-time-dashboard ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Real-time Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-600'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          {status && (
            <div className="text-sm text-gray-600">
              Features: {Object.values(status.features).filter(Boolean).length}/5 active
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Connection Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>WebSocket:</span>
                  <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {status && (
                  <>
                    <div className="flex justify-between">
                      <span>Uptime:</span>
                      <span>{Math.round(status.connectionHealth.uptime / 60000)}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reconnects:</span>
                      <span>{status.connectionHealth.reconnectCount}</span>
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Active Features</h3>
              <div className="space-y-2">
                {status && Object.entries(status.features).map(([feature, enabled]) => (
                  <div key={feature} className="flex justify-between items-center">
                    <span className="capitalize">{feature.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <button
                      onClick={() => handleFeatureToggle(feature, !enabled)}
                      className={`px-2 py-1 rounded text-xs ${
                        enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  onClick={() => simulateUpdate('experian', 750)}
                  variant="outline"
                  className="w-full"
                >
                  Simulate Credit Update
                </Button>
                <Button
                  onClick={() => disputes[0] && simulateDisputeUpdate(disputes[0].disputeId, 'response_received')}
                  variant="outline"
                  className="w-full"
                  disabled={!disputes.length}
                >
                  Simulate Dispute Update
                </Button>
                <Button
                  onClick={subscribeToPush}
                  variant="outline"
                  className="w-full"
                >
                  Enable Push Notifications
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'credit' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Credit Score Monitoring</h2>
              <div className="flex gap-2">
                {!isMonitoring ? (
                  <Button onClick={startMonitoring}>Start Monitoring</Button>
                ) : (
                  <Button onClick={stopMonitoring} variant="outline">Stop Monitoring</Button>
                )}
              </div>
            </div>

            {latestUpdate && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CreditScoreDisplay
                  score={latestUpdate.newScore}
                  change={latestUpdate.change}
                  bureau={latestUpdate.bureau}
                />
                <div className="md:col-span-2">
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2">Latest Update</h4>
                    <p className="text-gray-600 mb-2">
                      Your {latestUpdate.bureau} credit score {latestUpdate.change > 0 ? 'increased' : 'decreased'} by {Math.abs(latestUpdate.change)} points.
                    </p>
                    <div className="text-sm text-gray-500">
                      Updated: {new Date(latestUpdate.timestamp).toLocaleString()}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {pendingAlerts.length > 0 && (
              <Card className="p-4">
                <h4 className="font-semibold mb-4">Pending Alerts ({pendingAlerts.length})</h4>
                <div className="space-y-2">
                  {pendingAlerts.map((alert) => (
                    <Alert key={alert.id}>
                      <strong>{alert.title}</strong>: {alert.message}
                    </Alert>
                  ))}
                </div>
              </Card>
            )}

            <div className="flex gap-2">
              <Button onClick={() => simulateUpdate('experian', 720)} variant="outline">
                Simulate Experian Update
              </Button>
              <Button onClick={() => simulateUpdate('equifax', 730)} variant="outline">
                Simulate Equifax Update
              </Button>
              <Button onClick={() => simulateUpdate('transunion', 740)} variant="outline">
                Simulate TransUnion Update
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Notifications ({notifications.length})</h2>
              <div className="flex gap-2">
                <Button onClick={clearAll} variant="outline">Clear All</Button>
                <Button onClick={subscribeToPush}>Enable Push</Button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No notifications yet</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={(id) => markAsRead([id])}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'disputes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Dispute Tracking</h2>
              <div className="flex gap-2">
                {!isTracking ? (
                  <Button onClick={startTracking}>Start Tracking</Button>
                ) : (
                  <Button onClick={stopTracking} variant="outline">Stop Tracking</Button>
                )}
              </div>
            </div>

            {disputeMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{disputeMetrics.totalDisputes}</div>
                  <div className="text-sm text-gray-600">Total Disputes</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{disputeMetrics.activeDisputes}</div>
                  <div className="text-sm text-gray-600">Active</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{disputeMetrics.resolvedDisputes}</div>
                  <div className="text-sm text-gray-600">Resolved</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{disputeMetrics.successRate}%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </Card>
              </div>
            )}

            {disputes.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No disputes found</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {disputes.map((dispute) => (
                  <DisputeItem
                    key={dispute.disputeId}
                    dispute={dispute}
                    onUpdateStatus={updateDisputeStatus}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Chat Support</h2>
              {!chatSession && (
                <Button onClick={handleStartChat}>Start Chat</Button>
              )}
            </div>

            {chatSession ? (
              <ChatWindow
                session={chatSession}
                messages={chatMessages}
                onSendMessage={sendChatMessage}
                onEndChat={endChat}
              />
            ) : (
              <Card className="p-8 text-center">
                <h3 className="text-lg font-medium mb-2">No active chat session</h3>
                <p className="text-gray-600 mb-4">Start a chat to get help from our support team</p>
                <Button onClick={handleStartChat}>Start Chat Session</Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};