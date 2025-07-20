import React from 'react';
import { Card } from '@/components/ui/Card';
import { FileText, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface StatCardProps {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}

export function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600'
  };

  return (
    <Card className="p-6 bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-center">
        <div className={`p-3 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </Card>
  );
}

interface StatsOverviewProps {
  stats: {
    creditReports: number;
    resolvedDisputes: number;
    pendingDisputes: number;
    scoreImprovement: number;
  };
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        icon={FileText}
        label="Credit Reports"
        value={stats.creditReports}
        color="blue"
      />
      <StatCard
        icon={CheckCircle}
        label="Resolved Disputes"
        value={stats.resolvedDisputes}
        color="green"
      />
      <StatCard
        icon={Clock}
        label="Pending Disputes"
        value={stats.pendingDisputes}
        color="orange"
      />
      <StatCard
        icon={TrendingUp}
        label="Score Improvement"
        value={stats.scoreImprovement > 0 ? `+${stats.scoreImprovement}` : stats.scoreImprovement}
        color="purple"
      />
    </div>
  );
}