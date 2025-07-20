import React from 'react';
import { Card } from '@/components/ui/Card';
import { BarChart3 } from 'lucide-react';

interface DashboardStats {
  averageConfidence: number;
  lowConfidenceReports: number;
  qualityIssues: number;
}

interface QualityMetricsCardProps {
  stats: DashboardStats;
}

export function QualityMetricsCard({ stats }: QualityMetricsCardProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="p-6 bg-white dark:bg-gray-800 border-0 shadow-lg">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
        <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
        Data Quality
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Avg. Confidence</span>
          <span className={`font-bold ${getConfidenceColor(stats.averageConfidence)}`}>
            {stats.averageConfidence.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Low Confidence</span>
          <span className="font-bold text-red-600">
            {stats.lowConfidenceReports}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Quality Issues</span>
          <span className={`font-bold ${stats.qualityIssues > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
            {stats.qualityIssues}
          </span>
        </div>
        
        {stats.qualityIssues > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              Some reports have processing limitations that may affect accuracy.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}