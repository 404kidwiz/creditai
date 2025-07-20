'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'

export function CSSDebugComponent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CSS Debug Test</h1>
        
        {/* Test Card Component */}
        <Card>
          <CardHeader>
            <CardTitle>Test Card Component</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              This is a test card to verify CSS is loading properly.
            </p>
          </CardContent>
        </Card>

        {/* Test Alert Components */}
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Default Alert</AlertTitle>
            <AlertDescription>
              This is a default alert to test CSS styling.
            </AlertDescription>
          </Alert>

          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning Alert</AlertTitle>
            <AlertDescription>
              This is a warning alert with custom styling.
            </AlertDescription>
          </Alert>

          <Alert variant="success">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success Alert</AlertTitle>
            <AlertDescription>
              This is a success alert with custom styling.
            </AlertDescription>
          </Alert>
        </div>

        {/* Test Button Components */}
        <div className="flex flex-wrap gap-4">
          <Button>Primary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="destructive">Destructive Button</Button>
        </div>

        {/* Test Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200">Grid Item 1</h3>
            <p className="text-blue-600 dark:text-blue-400">Testing responsive grid</p>
          </div>
          <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-200">Grid Item 2</h3>
            <p className="text-green-600 dark:text-green-400">Testing responsive grid</p>
          </div>
          <div className="bg-purple-100 dark:bg-purple-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200">Grid Item 3</h3>
            <p className="text-purple-600 dark:text-purple-400">Testing responsive grid</p>
          </div>
        </div>

        {/* Test Custom CSS Variables */}
        <div className="space-y-2">
          <div className="h-4 bg-primary rounded"></div>
          <div className="h-4 bg-secondary rounded"></div>
          <div className="h-4 bg-accent rounded"></div>
          <div className="h-4 bg-muted rounded"></div>
        </div>
      </div>
    </div>
  )
}