'use client'

import React from 'react'
import { Button } from './Button'
import { Card, CardContent } from './Card'
import { cn } from '@/lib/utils'
import { LucideIcon, FileText, Upload, CreditCard, AlertCircle } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn('flex min-h-[300px] items-center justify-center p-8', className)}>
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {description}
          </p>
        )}
        {action && (
          <Button onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}

export function DashboardEmptyState() {
  return (
    <EmptyState
      icon={Upload}
      title="No Credit Reports Yet"
      description="Upload your first credit report to start tracking your credit score and identifying areas for improvement."
      action={{
        label: "Upload Credit Report",
        onClick: () => window.location.href = '/upload'
      }}
    />
  )
}

export function AnalysisEmptyState() {
  return (
    <EmptyState
      icon={CreditCard}
      title="No Analysis Available"
      description="We couldn't find any analysis data. This might be due to processing issues or missing credit report data."
      action={{
        label: "Upload New Report",
        onClick: () => window.location.href = '/upload'
      }}
    />
  )
}

export function ErrorEmptyState({ 
  title = "Something went wrong",
  description = "We encountered an error while loading your data. Please try again.",
  onRetry
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={onRetry ? {
        label: "Try Again",
        onClick: onRetry
      } : undefined}
    />
  )
}

interface DataEmptyStateProps {
  type: 'reports' | 'disputes' | 'accounts' | 'analysis'
  onAction?: () => void
}

export function DataEmptyState({ type, onAction }: DataEmptyStateProps) {
  const config = {
    reports: {
      icon: FileText,
      title: "No Credit Reports",
      description: "Upload your credit reports to start monitoring your credit health and identifying improvement opportunities.",
      actionLabel: "Upload Report"
    },
    disputes: {
      icon: AlertCircle,
      title: "No Active Disputes",
      description: "You don't have any active disputes. Upload a credit report to identify items that may need disputing.",
      actionLabel: "View Reports"
    },
    accounts: {
      icon: CreditCard,
      title: "No Accounts Found",
      description: "We couldn't find any credit accounts in your reports. Make sure your credit report was processed correctly.",
      actionLabel: "Upload New Report"
    },
    analysis: {
      icon: FileText,
      title: "No Analysis Available",
      description: "Analysis data is not available. This could be due to processing limitations or data quality issues.",
      actionLabel: "Try Upload Again"
    }
  }

  const { icon, title, description, actionLabel } = config[type]

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={onAction ? {
        label: actionLabel,
        onClick: onAction
      } : undefined}
    />
  )
}