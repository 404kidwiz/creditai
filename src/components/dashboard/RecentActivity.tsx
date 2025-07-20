import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/Loading';
import { DashboardEmptyState } from '@/components/ui/EmptyState';
import { ArrowRight, AlertTriangle } from 'lucide-react';

interface Activity {
  type: string;
  title: string;
  description: string;
  date: string;
  icon: any;
  confidence?: number;
  confidenceLevel?: string;
  hasIssue?: boolean;
  status?: string;
}

interface RecentActivityCardProps {
  activities: Activity[];
  isLoading: boolean;
}

export function RecentActivityCard({ activities, isLoading }: RecentActivityCardProps) {
  if (isLoading) {
    return (
      <Card className="p-6 bg-white dark:bg-gray-800 border-0 shadow-lg">
        <LoadingState title="Loading Activity..." />
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white dark:bg-gray-800 border-0 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h3>
        <Button variant="outline" size="sm" className="hover:bg-gray-100 dark:hover:bg-gray-700">
          View All
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      
      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = activity.icon;
            return (
              <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <Icon className={`w-5 h-5 ${activity.hasIssue ? 'text-orange-600' : 'text-blue-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{activity.title}</h4>
                    {activity.confidence && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        activity.confidenceLevel === 'high' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          : activity.confidenceLevel === 'medium'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                      }`}>
                        {activity.confidence}%
                      </span>
                    )}
                    {activity.hasIssue && (
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(activity.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <DashboardEmptyState />
      )}
    </Card>
  );
}