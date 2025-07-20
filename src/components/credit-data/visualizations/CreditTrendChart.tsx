'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface CreditScorePoint {
  date: string;
  score: number;
  bureau: string;
}

interface CreditTrendChartProps {
  data: CreditScorePoint[];
  className?: string;
}

export const CreditTrendChart: React.FC<CreditTrendChartProps> = ({ data, className = '' }) => {
  const bureaus = [...new Set(data.map(point => point.bureau))];
  const colors = ['#3B82F6', '#EF4444', '#10B981'];

  const chartData = {
    labels: [...new Set(data.map(point => point.date))].sort(),
    datasets: bureaus.map((bureau, index) => ({
      label: bureau,
      data: data
        .filter(point => point.bureau === bureau)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(point => point.score),
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length] + '20',
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6
    }))
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Credit Score Trends'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Credit Score'
        },
        min: 300,
        max: 850,
        ticks: {
          stepSize: 50
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};