'use client'

import React, { useState } from 'react'
import { PersonalInformationPanelProps } from '@/types/credit-ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfidenceIndicator } from './utils/ConfidenceIndicator'
import { Eye, EyeOff, User, MapPin, Phone, Calendar, Shield } from 'lucide-react'

export function PersonalInformationPanel({
  personalInfo,
  confidence,
  showSensitive,
  onToggleSensitive
}: PersonalInformationPanelProps) {
  const [localShowSensitive, setLocalShowSensitive] = useState(showSensitive)

  const handleToggleSensitive = () => {
    setLocalShowSensitive(!localShowSensitive)
    onToggleSensitive()
  }

  const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
    if (!data || localShowSensitive) return data
    if (data.length <= visibleChars) return '•'.repeat(data.length)
    return '•'.repeat(data.length - visibleChars) + data.slice(-visibleChars)
  }

  const formatSSN = (ssn?: string): string => {
    if (!ssn) return 'Not available'
    if (localShowSensitive) return ssn
    return '***-**-' + ssn.slice(-4)
  }

  const formatPhone = (phone?: string): string => {
    if (!phone) return 'Not available'
    if (localShowSensitive) return phone
    return '(***) ***-' + phone.slice(-4)
  }

  const getDataQualityColor = (conf: number): string => {
    if (conf >= 85) return 'border-green-200 bg-green-50 dark:bg-green-900/10'
    if (conf >= 70) return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10'
    return 'border-red-200 bg-red-50 dark:bg-red-900/10'
  }

  return (
    <Card className={`w-full ${getDataQualityColor(confidence)}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
          <div className="flex items-center gap-2">
            <ConfidenceIndicator confidence={confidence} size="sm" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleSensitive}
              className="flex items-center gap-2"
            >
              {localShowSensitive ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Show Details
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Quality Warning */}
        {confidence < 70 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Limited Data Quality
                </p>
                <p className="text-yellow-700 dark:text-yellow-300">
                  Personal information extraction had {confidence.toFixed(0)}% confidence. 
                  Some details may be incomplete or require manual verification.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Personal Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <User className="w-4 h-4" />
              Full Name
            </label>
            <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="font-medium text-gray-900 dark:text-white">
                {personalInfo.name || 'Not available'}
              </div>
              {!localShowSensitive && personalInfo.name && (
                <div className="text-xs text-gray-500 mt-1">
                  Click "Show Details" to view full name
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address
            </label>
            <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="font-medium text-gray-900 dark:text-white">
                {localShowSensitive ? personalInfo.address : maskSensitiveData(personalInfo.address || '', 10)}
              </div>
              {!localShowSensitive && personalInfo.address && (
                <div className="text-xs text-gray-500 mt-1">
                  Address partially hidden for privacy
                </div>
              )}
            </div>
          </div>

          {/* SSN */}
          {personalInfo.ssn && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Social Security Number
              </label>
              <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="font-medium text-gray-900 dark:text-white font-mono">
                  {formatSSN(personalInfo.ssn)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {localShowSensitive ? 'Full SSN visible' : 'Last 4 digits only'}
                </div>
              </div>
            </div>
          )}

          {/* Date of Birth */}
          {personalInfo.dateOfBirth && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date of Birth
              </label>
              <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="font-medium text-gray-900 dark:text-white">
                  {localShowSensitive ? personalInfo.dateOfBirth : maskSensitiveData(personalInfo.dateOfBirth, 2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {localShowSensitive ? 'Full date visible' : 'Partially hidden for privacy'}
                </div>
              </div>
            </div>
          )}

          {/* Phone */}
          {personalInfo.phone && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </label>
              <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="font-medium text-gray-900 dark:text-white font-mono">
                  {formatPhone(personalInfo.phone)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {localShowSensitive ? 'Full number visible' : 'Last 4 digits only'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Privacy Protection
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Your personal information is automatically masked for privacy. 
                Use the "Show Details" button to temporarily view full information when needed.
              </p>
            </div>
          </div>
        </div>

        {/* No Data State */}
        {!personalInfo.name && !personalInfo.address && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <User className="w-12 h-12 mx-auto" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Personal Information Not Available
            </h4>
            <p className="text-gray-600 dark:text-gray-400">
              Personal information could not be extracted reliably from this document.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}