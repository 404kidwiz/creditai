'use client';

import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { staggerContainer, staggerItem } from '@/lib/animations/variants';
import { cn } from '@/lib/utils';

interface ThemeOption {
  value: 'light' | 'dark' | 'system';
  label: string;
  description: string;
  icon: React.ReactNode;
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Clean and bright interface',
    icon: <Sun className="h-5 w-5" />,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Easy on the eyes in low light',
    icon: <Moon className="h-5 w-5" />,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Matches your device setting',
    icon: <Monitor className="h-5 w-5" />,
  },
];

export function ThemeSettings() {
  const { theme, setTheme, mounted, resolvedTheme } = useTheme();

  if (!mounted) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Theme Preferences</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={staggerItem}>
        <h3 className="text-lg font-semibold mb-2">Theme Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Choose how CreditAI looks and feels. Your preference will be saved and applied across all devices.
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        variants={staggerContainer}
      >
        {themeOptions.map((option) => (
          <motion.div key={option.value} variants={staggerItem}>
            <Card
              className={cn(
                'relative cursor-pointer transition-all duration-200 hover:shadow-md',
                theme === option.value && 'ring-2 ring-primary ring-offset-2'
              )}
              onClick={() => setTheme(option.value)}
            >
              <div className="p-6">
                {/* Theme preview */}
                <div className="mb-4 h-16 rounded-md border overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-colors',
                      option.value === 'light' && 'bg-white',
                      option.value === 'dark' && 'bg-gray-900',
                      option.value === 'system' && 
                        (resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white')
                    )}
                  >
                    <div
                      className={cn(
                        'h-4 transition-colors',
                        option.value === 'light' && 'bg-gray-100',
                        option.value === 'dark' && 'bg-gray-800',
                        option.value === 'system' && 
                          (resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100')
                      )}
                    />
                    <div className="p-2 space-y-1">
                      <div
                        className={cn(
                          'h-2 w-3/4 rounded transition-colors',
                          option.value === 'light' && 'bg-gray-200',
                          option.value === 'dark' && 'bg-gray-700',
                          option.value === 'system' && 
                            (resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200')
                        )}
                      />
                      <div
                        className={cn(
                          'h-2 w-1/2 rounded transition-colors',
                          option.value === 'light' && 'bg-gray-300',
                          option.value === 'dark' && 'bg-gray-600',
                          option.value === 'system' && 
                            (resolvedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-300')
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Theme info */}
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-muted-foreground">
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{option.label}</h4>
                      {theme === option.value && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Additional theme info */}
      <motion.div variants={staggerItem}>
        <Card className="p-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <Monitor className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">System Theme Detection</h4>
              <p className="text-sm text-muted-foreground">
                When system is selected, the theme automatically switches between light and dark 
                based on your device's settings and time of day preferences.
              </p>
              {theme === 'system' && (
                <p className="text-sm font-medium mt-2">
                  Currently using: {resolvedTheme} mode
                </p>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick toggle button */}
      <motion.div variants={staggerItem}>
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-medium">Quick Theme Toggle</h4>
            <p className="text-sm text-muted-foreground">
              Use keyboard shortcut Ctrl+Shift+T to quickly switch themes
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            disabled={theme === 'system'}
          >
            Toggle Theme
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}