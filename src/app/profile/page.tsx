'use client'

import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Shield,
  Calendar
} from 'lucide-react'

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Profile Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account information and preferences
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Account Information
          </h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center mt-1">
                  <Mail className="w-4 h-4 text-gray-400 mr-2" />
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="bg-gray-50 dark:bg-gray-700"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <Label htmlFor="userId">User ID</Label>
                <div className="flex items-center mt-1">
                  <Shield className="w-4 h-4 text-gray-400 mr-2" />
                  <Input
                    id="userId"
                    value={user.id}
                    disabled
                    className="bg-gray-50 dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="createdAt">Account Created</Label>
                <div className="flex items-center mt-1">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <Input
                    id="createdAt"
                    value={new Date(user.created_at).toLocaleDateString()}
                    disabled
                    className="bg-gray-50 dark:bg-gray-700"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="lastSignIn">Last Sign In</Label>
                <div className="flex items-center mt-1">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <Input
                    id="lastSignIn"
                    value={user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                    disabled
                    className="bg-gray-50 dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="emailVerified">Email Verification Status</Label>
              <div className="flex items-center mt-1">
                <div className={`w-4 h-4 rounded-full mr-2 ${user.email_confirmed_at ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <Input
                  id="emailVerified"
                  value={user.email_confirmed_at ? 'Verified' : 'Not Verified'}
                  disabled
                  className="bg-gray-50 dark:bg-gray-700"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Account Actions
            </h3>
            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/settings')}
              >
                Settings
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/reset-password')}
              >
                Change Password
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 