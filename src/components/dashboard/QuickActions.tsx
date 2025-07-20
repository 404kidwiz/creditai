import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Upload, Eye, Settings, Shield } from 'lucide-react';

export function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      icon: Upload,
      label: 'Upload Credit Report',
      onClick: () => router.push('/upload'),
      className: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white',
    },
    {
      icon: Eye,
      label: 'View Analysis',
      onClick: () => router.push('/analysis-results'),
      variant: 'outline' as const,
      className: 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => router.push('/settings'),
      variant: 'outline' as const,
      className: 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
    },
    {
      icon: Shield,
      label: 'Help & Support',
      onClick: () => window.open('/help', '_blank'),
      variant: 'outline' as const,
      className: 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
    },
  ];

  return (
    <div className="mb-8">
      <Card className="p-8 bg-white dark:bg-gray-800 border-0 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              variant={action.variant}
              className={`${action.className} h-16 text-lg font-semibold`}
            >
              <action.icon className="w-5 h-5 mr-3" />
              {action.label}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}