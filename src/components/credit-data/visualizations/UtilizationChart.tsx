'use client';

import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface UtilizationData {
  accountName: string;
  utilized: number;
  available: number;
  utilizationRate: number;
}

interface UtilizationChartProps {
  data: UtilizationData[];
  className?: string;
}

export const UtilizationChart: React.FC<UtilizationChartProps> = ({ data, className = '' }) => {
  const getUtilizationColor = (rate: number) => {
    if (rate <= 10) return '#10B981'; // Green
    if (rate <= 30) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const chartData = {
    labels: data.map(item => item.accountName),
    datasets: [
      {
        data: data.map(item => item.utilizationRate),
        backgroundColor: data.map(item => getUtilizationColor(item.utilizationRate)),
        borderColor: data.map(item => getUtilizationColor(item.utilizationRate)),
        borderWidth: 2,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          generateLabels: (chart: any) => {
            const data = chart.data;
            return data.labels.map((label: string, index: number) => ({
              text: `${label}: ${data.datasets[0].data[index]}%`,
              fillStyle: data.datasets[0].backgroundColor[index],
              strokeStyle: data.datasets[0].borderColor[index],
              lineWidth: data.datasets[0].borderWidth,
              hidden: false,
              index
            }));
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const dataItem = data[context.dataIndex];
            return [
              `Utilization: ${dataItem.utilizationRate}%`,
              `Used: $${dataItem.utilized.toLocaleString()}`,
              `Available: $${dataItem.available.toLocaleString()}`
            ];
          }
        }
      }
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Credit Utilization by Account</h3>
      <div className="h-64">
        <Doughnut data={chartData} options={options} />
      </div>
      
      {/* Utilization Guidelines */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">Utilization Guidelines</h4>
        <div className="space-y-1 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>Excellent: 0-10%</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span>Good: 11-30%</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span>Poor: 31%+</span>
          </div>
        </div>
      </div>
    </div>
  );
};