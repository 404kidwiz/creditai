'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Shield,
  Bell,
  CreditCard,
  Trash2,
  Save,
  Eye,
  EyeOff
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    email: ''
  })
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    scoreUpdates: true,
    disputeReminders: true
  })

  const loadProfile = useCallback(async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setProfile({
        full_name: data.full_name || '',
        phone: data.phone || '',
        email: user.email || ''
      })
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user, loadProfile])

  const handleProfileUpdate = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!user) return
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      toast.success('Password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Error updating password:', error)
      toast.error('Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.admin.deleteUser(user.id)
      
      if (error) throw error

      toast.success('Account deleted successfully')
      router.push('/')
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Failed to delete account')
    } finally {
      setIsLoading(false)
    }
  }

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
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card className="p-6">
            <div className="flex items-center mb-6">
              <User className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Profile Information
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={profile.full_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-gray-50 dark:bg-gray-700"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                />
              </div>
            </div>
            
            <Button
              onClick={handleProfileUpdate}
              disabled={isLoading}
              className="inline-flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </Card>

          {/* Password Settings */}
          <Card className="p-6">
            <div className="flex items-center mb-6">
              <Shield className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Change Password
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>
            </div>
            
            <Button
              onClick={handlePasswordChange}
              disabled={isLoading || !newPassword || !confirmPassword}
              variant="outline"
              className="inline-flex items-center"
            >
              <Shield className="w-4 h-4 mr-2" />
              Update Password
            </Button>
          </Card>

          {/* Notification Settings */}
          <Card className="p-6">
            <div className="flex items-center mb-6">
              <Bell className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Notification Preferences
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Email Notifications</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive updates via email
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications(prev => ({ ...prev, email: e.target.checked }))}
                  className="rounded border-gray-300"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">SMS Notifications</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive updates via text message
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.sms}
                  onChange={(e) => setNotifications(prev => ({ ...prev, sms: e.target.checked }))}
                  className="rounded border-gray-300"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Credit Score Updates</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get notified when your score changes
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.scoreUpdates}
                  onChange={(e) => setNotifications(prev => ({ ...prev, scoreUpdates: e.target.checked }))}
                  className="rounded border-gray-300"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Dispute Reminders</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Reminders for pending disputes
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.disputeReminders}
                  onChange={(e) => setNotifications(prev => ({ ...prev, disputeReminders: e.target.checked }))}
                  className="rounded border-gray-300"
                />
              </div>
            </div>
          </Card>

          {/* Subscription Settings */}
          <Card className="p-6">
            <div className="flex items-center mb-6">
              <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Subscription
              </h2>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Current Plan</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Free Plan
                  </p>
                </div>
                <Button
                  onClick={() => router.push('/pricing')}
                  variant="outline"
                  size="sm"
                >
                  Upgrade Plan
                </Button>
              </div>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="p-6 border-red-200 dark:border-red-800">
            <div className="flex items-center mb-6">
              <Trash2 className="w-5 h-5 text-red-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Danger Zone
              </h2>
            </div>
            
            <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 mb-4">
              <div className="font-medium">Delete Account</div>
              <div className="text-sm">
                This action cannot be undone. All your data will be permanently deleted.
              </div>
            </Alert>
            
            <Button
              onClick={handleDeleteAccount}
              disabled={isLoading}
              variant="destructive"
              className="inline-flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
} 